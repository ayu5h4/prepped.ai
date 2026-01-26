import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ Error: API Key not found in .env")
else:
    print(f"✅ Found API Key: {api_key[:5]}... (hidden)")
    
    try:
        genai.configure(api_key=api_key)
        print("🔍 Listing available models for this key...")
        
        models = list(genai.list_models())
        found_any = False
        for m in models:
            # We only care about models that support 'generateContent' (chat)
            if 'generateContent' in m.supported_generation_methods:
                print(f"   👉 Available: {m.name}")
                found_any = True
        
        if not found_any:
            print("❌ No chat models found. Your API Key might be invalid or the API is not enabled in Google Cloud Console.")
            
    except Exception as e:
        print(f"❌ Connection Error: {e}")