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

# 1. Load Environment Variables
load_dotenv()
GENAI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GENAI_API_KEY:
    print("⚠️  CRITICAL WARNING: GEMINI_API_KEY is missing from .env file!")

# 2. Configure Gemini
genai.configure(api_key=GENAI_API_KEY)

app = FastAPI(title="MockOS API")

# 3. CORS - Allow Frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Global State (Wipes on restart)
INTERVIEW_STATE = {
    "system_context": None,
    "is_initialized": False
}

# 5. Data Models
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[Message] = []

# 6. Helper: PDF Extraction
def extract_text_from_pdf_file(pdf_file: UploadFile) -> str:
    try:
        reader = pypdf.PdfReader(pdf_file.file)
        full_text = ""
        for page in reader.pages:
            text = page.extract_text()
            if text:
                full_text += text + "\n"
        return full_text.strip()
    except Exception as e:
        print(f"PDF Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to read PDF")

# --- Endpoints ---

@app.post("/submit-context")
async def submit_context(file: UploadFile = File(...), job_description: str = Form(...)):
    print(f"📥 Received Context: {file.filename}")
    
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="File must be a PDF")

    try:
        resume_text = extract_text_from_pdf_file(file)
        
        system_prompt = f"""
        ROLE: You are a strict, professional Senior Technical Interviewer.
        GOAL: Conduct a technical interview for the Job Description provided.
        
        RULES:
        1. Ask ONE question at a time.
        2. Do not reveal the answer immediately. Wait for the candidate to respond.
        3. If the answer is wrong, probe deeper.
        4. Be concise.
        
        --- JOB DESCRIPTION ---
        {job_description}
        
        --- CANDIDATE RESUME ---
        {resume_text}
        """

        INTERVIEW_STATE["system_context"] = system_prompt
        INTERVIEW_STATE["is_initialized"] = True
        
        print("✅ Context Loaded Successfully")
        return {"message": "Context loaded successfully"}
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat(request: ChatRequest):
    if not INTERVIEW_STATE["is_initialized"]:
        raise HTTPException(status_code=400, detail="Context missing. Please upload Resume/JD first.")

    try:
        # Initialize Model
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=INTERVIEW_STATE["system_context"]
        )

        # Convert History for Gemini
        # Gemini expects: [{'role': 'user', 'parts': ['msg']}, {'role': 'model', 'parts': ['msg']}]
        gemini_history = []
        for msg in request.history:
            role_map = "user" if msg.role == "user" else "model"
            gemini_history.append({"role": role_map, "parts": [msg.content]})

        # Start Chat
        chat_session = model.start_chat(history=gemini_history)
        
        # Send Message
        response = chat_session.send_message(request.message)
        
        return {"response": response.text}

    except Exception as e:
        # --- DEBUG LOGGING ---
        print("\n❌ CRITICAL ERROR IN /chat ENDPOINT:")
        traceback.print_exc() # This prints the specific line number and error to terminal
        # ---------------------
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)