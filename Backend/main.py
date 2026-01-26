import os
import uvicorn
import traceback
from typing import List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pypdf
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
GENAI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GENAI_API_KEY:
    print("⚠️  CRITICAL WARNING: GEMINI_API_KEY is missing!")

genai.configure(api_key=GENAI_API_KEY)

# --- REBRAND CHANGE: Title Updated ---
app = FastAPI(title="Prepped.ai API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

INTERVIEW_STATE = {
    "system_context": None,
    "is_initialized": False
}

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[Message] = []

# --- NEW FEATURE: Feedback Request Model ---
class FeedbackRequest(BaseModel):
    history: List[Message]

def extract_text_from_pdf_file(pdf_file: UploadFile) -> str:
    try:
        reader = pypdf.PdfReader(pdf_file.file)
        full_text = ""
        for page in reader.pages:
            text = page.extract_text()
            if text: full_text += text + "\n"
        return full_text.strip()
    except Exception as e:
        print(f"PDF Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to read PDF")

@app.post("/submit-context")
async def submit_context(file: UploadFile = File(...), job_description: str = Form(...)):
    print(f"📥 Received Context for Prepped.ai: {file.filename}")
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="File must be a PDF")

    try:
        resume_text = extract_text_from_pdf_file(file)
        # --- REBRAND CHANGE: Updated Persona Name in Prompt ---
        system_prompt = f"""
        ROLE: You are the 'Prepped.ai' Senior Technical Interviewer.
        GOAL: Conduct a technical interview for the Job Description provided.
        RULES:
        1. Ask ONE question at a time.
        2. Wait for the candidate to respond.
        3. Be professional but strict.
        
        --- JOB DESCRIPTION ---
        {job_description}
        
        --- CANDIDATE RESUME ---
        {resume_text}
        """
        INTERVIEW_STATE["system_context"] = system_prompt
        INTERVIEW_STATE["is_initialized"] = True
        return {"message": "Prepped.ai Context loaded."}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat(request: ChatRequest):
    if not INTERVIEW_STATE["is_initialized"]:
        raise HTTPException(status_code=400, detail="Context missing.")
    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash", # Keeping your working model
            system_instruction=INTERVIEW_STATE["system_context"]
        )
        gemini_history = []
        for msg in request.history:
            role_map = "user" if msg.role == "user" else "model"
            gemini_history.append({"role": role_map, "parts": [msg.content]})

        chat_session = model.start_chat(history=gemini_history)
        response = chat_session.send_message(request.message)
        return {"response": response.text}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")

# --- NEW FEATURE: Feedback Endpoint ---
@app.post("/feedback")
async def get_feedback(request: FeedbackRequest):
    """
    Analyzes the chat history and provides scores and feedback.
    """
    try:
        # We create a new "Feedback" prompt using the chat history
        conversation_text = ""
        for msg in request.history:
            conversation_text += f"{msg.role.upper()}: {msg.content}\n"

        feedback_prompt = f"""
        Analyze the following technical interview conversation.
        Provide constructive feedback to the candidate.
        
        Output format:
        1. Score (0-10)
        2. Strong Points (Bullet points)
        3. Areas for Improvement (Bullet points)
        4. Final Verdict (Hire / No Hire)

        --- CONVERSATION ---
        {conversation_text}
        """

        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(feedback_prompt)
        return {"feedback": response.text}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Feedback Error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)