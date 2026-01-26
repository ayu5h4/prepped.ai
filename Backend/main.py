import os
import uvicorn
import traceback
import base64
import io
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pypdf
from dotenv import load_dotenv
import google.generativeai as genai
import edge_tts  # NEW IMPORT

# Load Environment Variables
load_dotenv()
GENAI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GENAI_API_KEY:
    print("⚠️  CRITICAL WARNING: GEMINI_API_KEY is missing!")

# Configure Gemini
genai.configure(api_key=GENAI_API_KEY)

app = FastAPI(title="Prepped.ai API (Voice Version)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global State
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

class FeedbackRequest(BaseModel):
    history: List[Message]

# --- Helper: PDF Extraction ---
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

# --- Helper: Text to Speech (Async) ---
async def text_to_speech_base64(text: str) -> str:
    """
    Generates MP3 audio from text using edge-tts and returns it as a Base64 string.
    """
    try:
        # Voice: 'en-US-ChristopherNeural' is a good male interview voice
        # Options: 'en-US-AriaNeural', 'en-US-GuyNeural', etc.
        communicate = edge_tts.Communicate(text, "en-US-ChristopherNeural")
        
        # Create an in-memory buffer
        audio_stream = io.BytesIO()
        
        # Iterate over the audio stream chunks and write to buffer
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_stream.write(chunk["data"])
        
        # Get the bytes and encode to base64
        audio_stream.seek(0)
        audio_base64 = base64.b64encode(audio_stream.read()).decode('utf-8')
        return audio_base64
    except Exception as e:
        print(f"TTS Error: {e}")
        return None

# --- Endpoints ---

@app.post("/submit-context")
async def submit_context(file: UploadFile = File(...), job_description: str = Form(...)):
    print(f"📥 Received Context: {file.filename}")
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="File must be a PDF")

    try:
        resume_text = extract_text_from_pdf_file(file)
        
        system_prompt = f"""
        ROLE: You are the 'Prepped.ai' Senior Technical Interviewer.
        GOAL: Conduct a technical interview.
        RULES:
        1. Ask ONE question at a time.
        2. Keep your responses CONCISE (spoken length). 
        3. Do not read code blocks out loud if possible, summarize them.
        
        --- JOB DESCRIPTION ---
        {job_description}
        
        --- CANDIDATE RESUME ---
        {resume_text}
        """

        INTERVIEW_STATE["system_context"] = system_prompt
        INTERVIEW_STATE["is_initialized"] = True
        return {"message": "Context loaded."}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat(request: ChatRequest):
    if not INTERVIEW_STATE["is_initialized"]:
        raise HTTPException(status_code=400, detail="Context missing.")

    try:
        # 1. Generate Text Response with Gemini
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=INTERVIEW_STATE["system_context"]
        )
        
        gemini_history = []
        for msg in request.history:
            role_map = "user" if msg.role == "user" else "model"
            gemini_history.append({"role": role_map, "parts": [msg.content]})

        chat_session = model.start_chat(history=gemini_history)
        response = chat_session.send_message(request.message)
        text_response = response.text

        # 2. Generate Audio Response (TTS)
        audio_b64 = await text_to_speech_base64(text_response)

        # 3. Return both
        return {
            "response": text_response,
            "audio": audio_b64 # Frontend will play this string
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")

@app.post("/feedback")
async def get_feedback(request: FeedbackRequest):
    try:
        conversation_text = ""
        for msg in request.history:
            conversation_text += f"{msg.role.upper()}: {msg.content}\n"

        feedback_prompt = f"""
        Analyze this interview. Provide:
        1. Score (0-10)
        2. Strong Points
        3. Weak Points
        4. Verdict (Hire/No Hire)
        
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