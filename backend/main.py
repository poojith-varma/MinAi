from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import os

# LangChain Imports
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

# Load environment variables
load_dotenv()

# FastAPI App
app = FastAPI()

# Embedding Model
embedding_model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenRouter Client
client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
    timeout=60,
)

# Request Model
class ChatRequest(BaseModel):
    message: str

# Root Route
@app.get("/")
async def root():

    return {
        "message": "MinAI backend is running"
    }

# Normal AI Chat Endpoint
@app.post("/chat")
async def chat(req: ChatRequest):

    try:

        completion = client.chat.completions.create(
            model="meta-llama/llama-3.3-70b-instruct:free",
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

IMPORTANT:
- ALWAYS respond entirely in English
- NEVER switch languages
- Keep responses clean and readable
"""
                },
                {
                    "role": "user",
                    "content": req.message
                }
            ]
        )

        response_text = completion.choices[0].message.content

        if response_text is None or response_text.strip() == "":
            response_text = """
I could not generate a complete response.

Try:
- asking more specifically
- rephrasing the question
"""

        return {
            "response": response_text
        }

    except Exception as e:

        return {
            "error": str(e)
        }

# PDF Upload Endpoint
@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):

    try:

        # Save uploaded file
        file_path = f"uploads/{file.filename}"

        with open(file_path, "wb") as f:
            f.write(await file.read())

        # Load PDF
        loader = PyPDFLoader(file_path)
        documents = loader.load()

        # Better Chunking
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1500,
            chunk_overlap=300
        )

        docs = splitter.split_documents(documents)

        # Create Vector Database
        vectorstore = Chroma.from_documents(
            docs,
            embedding_model,
            persist_directory="chroma_db"
        )

        return {
            "message": "PDF uploaded and indexed successfully",
            "chunks": len(docs),
            "filename": file.filename
        }

    except Exception as e:

        return {
            "error": str(e)
        }

# Ask Questions About Uploaded PDFs (RAG)
@app.post("/ask-pdf")
async def ask_pdf(req: ChatRequest):

    try:

        # Load Vector Database
        vectorstore = Chroma(
            persist_directory="chroma_db",
            embedding_function=embedding_model
        )

        # Better Semantic Retrieval
        docs = vectorstore.similarity_search(
            f"Educational explanation about: {req.message}",
            k=6
        )

        # Combine Retrieved Chunks
        context = "\n\n".join(
            [doc.page_content for doc in docs]
        )

        # Generate AI Response
        completion = client.chat.completions.create(
            model="nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
            messages=[
                {
                    "role": "system",
                    "content": f"""
You are MinAI, an advanced AI research assistant.

Your responsibilities:
- Understand uploaded documents deeply
- Answer direct and conceptual questions
- Explain topics clearly and professionally
- Use document context intelligently
- Provide educational answers

IMPORTANT RULES:
- ALWAYS respond entirely in English
- NEVER switch languages
- Use the document context as primary knowledge
- You may use general knowledge to improve explanations
- If the question relates to the document topic, answer intelligently
- Give detailed but concise responses
- Maintain professional formatting
- Explain concepts in a student-friendly way

Document Context:
{context}
"""
                },
                {
                    "role": "user",
                    "content": req.message
                }
            ]
        )

        response_text = completion.choices[0].message.content

        if response_text is None or response_text.strip() == "":
            response_text = """
I could not generate a complete response.

Try:
- asking more specifically
- uploading a clearer document
- rephrasing the question
"""

        return {
            "response": response_text,
            "context_chunks": len(docs)
        }

    except Exception as e:

        return {
            "error": str(e)
        }