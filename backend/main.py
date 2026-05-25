from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenRouter client
client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
    timeout=60,
)

# Request model
class ChatRequest(BaseModel):
    message: str

# Root route
@app.get("/")
async def root():
    return {"message": "MinAI backend is running"}

# Chat endpoint
@app.post("/chat")
async def chat(req: ChatRequest):

    completion = client.chat.completions.create(
        model="nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
        messages=[
            {
                "role": "system",
                "content": """
You are MinAI, a futuristic AI workspace assistant.

Your responsibilities:
- Help users research topics
- Summarize information
- Explain concepts clearly
- Assist with document analysis
- Maintain concise and professional responses
"""
            },
            {
                "role": "user",
                "content": req.message
            }
        ]
    )

    return {
        "response": completion.choices[0].message.content
    }