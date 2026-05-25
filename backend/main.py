from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
import os

# LangChain Imports
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

# Load Environment Variables
load_dotenv()

# FastAPI App
app = FastAPI()

# -----------------------------------------
# LIGHTWEIGHT EMBEDDING LOADER
# -----------------------------------------
def get_embedding_model():

    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

# -----------------------------------------
# ENABLE CORS
# -----------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------
# GROQ CLIENT
# -----------------------------------------
client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

# -----------------------------------------
# REQUEST MODEL
# -----------------------------------------
class ChatRequest(BaseModel):
    message: str

# -----------------------------------------
# ROOT ROUTE
# -----------------------------------------
@app.get("/")
async def root():

    return {
        "message": "MinAI backend is running"
    }

# -----------------------------------------
# AI RESPONSE GENERATOR
# -----------------------------------------
def generate_ai_response(messages):

    models = [
        "llama-3.3-70b-versatile",
        "llama3-8b-8192"
    ]

    for model_name in models:

        try:

            print(f"\nTrying model: {model_name}")

            completion = client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=0.3,
                max_tokens=700
            )

            response_text = (
                completion.choices[0]
                .message
                .content
            )

            if (
                response_text is not None
                and response_text.strip() != ""
            ):

                print(f"\nSUCCESS: {model_name}")

                return response_text

        except Exception as e:

            print(f"\nFAILED: {model_name}")
            print(str(e))

    return None

# -----------------------------------------
# NORMAL CHAT
# -----------------------------------------
@app.post("/chat")
async def chat(req: ChatRequest):

    try:

        messages = [
            {
                "role": "system",
                "content": """
You are MinAI, a futuristic AI workspace assistant.

Responsibilities:
- Answer questions clearly
- Explain concepts professionally
- Maintain concise and helpful responses

IMPORTANT:
- ALWAYS respond in English
- NEVER switch languages
"""
            },
            {
                "role": "user",
                "content": req.message
            }
        ]

        response_text = generate_ai_response(messages)

        if (
            response_text is None
            or response_text.strip() == ""
        ):

            response_text = """
All AI models are currently busy.

Please try again in a few seconds.
"""

        return {
            "response": response_text
        }

    except Exception as e:

        print("\n========== CHAT ERROR ==========")
        print(str(e))
        print("================================\n")

        return {
            "error": str(e)
        }

# -----------------------------------------
# PDF UPLOAD
# -----------------------------------------
@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):

    try:

        os.makedirs("uploads", exist_ok=True)

        file_path = f"uploads/{file.filename}"

        with open(file_path, "wb") as f:
            f.write(await file.read())

        # Load PDF
        loader = PyPDFLoader(file_path)

        documents = loader.load()

        # Split Documents
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1200,
            chunk_overlap=200
        )

        docs = splitter.split_documents(documents)

        # Create Vector DB
        vectorstore = Chroma(
            persist_directory="chroma_db",
            embedding_function=get_embedding_model()
        )

        # Add Documents
        vectorstore.add_documents(docs)

        print("\n========== PDF INDEXED ==========")
        print(f"Chunks Created: {len(docs)}")
        print("=================================\n")

        return {
            "message": "PDF uploaded successfully",
            "chunks": len(docs),
            "filename": file.filename
        }

    except Exception as e:

        print("\n========== PDF ERROR ==========")
        print(str(e))
        print("================================\n")

        return {
            "error": str(e)
        }

# -----------------------------------------
# PDF RAG CHAT
# -----------------------------------------
@app.post("/ask-pdf")
async def ask_pdf(req: ChatRequest):

    try:

        # Load Existing Vector DB
        vectorstore = Chroma(
            persist_directory="chroma_db",
            embedding_function=get_embedding_model()
        )

        # Semantic Search
        docs = vectorstore.similarity_search(
            req.message,
            k=3
        )

        context_parts = []

        sources = []

        for doc in docs:

            text = doc.page_content.strip()

            if len(text) > 40:
                context_parts.append(text)

            page = doc.metadata.get("page", "Unknown")

            if page != "Unknown":
                page = page + 1

            sources.append(f"Page {page}")

        # Remove duplicates
        sources = list(set(sources))

        context = "\n\n".join(context_parts)

        print("\n========== RETRIEVED CONTEXT ==========")
        print(context[:1200])
        print("=======================================\n")

        # No Context
        if context.strip() == "":

            return {
                "response": """
I could not find relevant information in the uploaded PDF.
""",
                "sources": []
            }

        # AI Prompt
        messages = [
            {
                "role": "system",
                "content": """
You are MinAI, an intelligent educational AI assistant.

Rules:
- ALWAYS answer in English
- Explain concepts clearly
- Be concise but informative
- Use simple educational language
- Answer using the provided document context
"""
            },
            {
                "role": "user",
                "content": f"""
Question:
{req.message}

Document Context:
{context}

Answer:
"""
            }
        ]

        # Generate AI Response
        response_text = generate_ai_response(messages)

        # Fallback
        if (
            response_text is None
            or response_text.strip() == ""
        ):

            response_text = f"""
I found relevant information in the document but the AI models are currently busy.

Relevant Sources:
{", ".join(sources)}

Please try again in a few seconds.
"""

        print("\n========== FINAL RESPONSE ==========")
        print(response_text)
        print("====================================\n")

        return {
            "response": response_text,
            "sources": sources
        }

    except Exception as e:

        print("\n========== RAG ERROR ==========")
        print(str(e))
        print("================================\n")

        return {
            "error": str(e)
        }