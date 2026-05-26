from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
import os

from rank_bm25 import BM25Okapi

# LangChain Imports
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

# -----------------------------------------
# LOAD ENV
# -----------------------------------------
load_dotenv()

# -----------------------------------------
# FASTAPI
# -----------------------------------------
app = FastAPI()

# -----------------------------------------
# CORS
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
all_chunks = []
vectorstore = None

last_pdf_topic = ""

# -----------------------------------------
# REQUEST MODEL
# -----------------------------------------
class ChatRequest(BaseModel):
    message: str

# -----------------------------------------
# LOAD EMBEDDING MODEL ON STARTUP
# -----------------------------------------
print("\nLoading embedding model...")
print("First startup may take a few minutes...\n")

embedding_model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

print("\nEmbedding model loaded successfully.\n")

# -----------------------------------------
# ROOT ROUTE
# -----------------------------------------
@app.get("/")
async def root():

    return {
        "message": "MinAI backend is running"
    }

# -----------------------------------------
# MODEL FALLBACK FUNCTION
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

        print("\n========== PDF UPLOAD STARTED ==========")

        # Create uploads folder
        os.makedirs("uploads", exist_ok=True)

        file_path = f"uploads/{file.filename}"

        # Save file
        with open(file_path, "wb") as f:

            content = await file.read()

            f.write(content)

        print("PDF SAVED")

        # Load PDF
        print("LOADING PDF...")

        loader = PyPDFLoader(file_path)

        documents = loader.load()

        print(f"PDF LOADED | Pages: {len(documents)}")

        # Split into chunks
        print("SPLITTING DOCUMENTS...")

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1200,
            chunk_overlap=200
        )

        docs = splitter.split_documents(documents)
        global all_chunks

        for doc in docs:

          doc.metadata["source"] = file.filename

        for doc in docs:

          all_chunks.append(doc.page_content)

        print(f"CHUNKS CREATED: {len(docs)}")

                # Create vector DB
        global vectorstore

        if vectorstore is None:

            print("CREATING VECTOR STORE...")

            vectorstore = Chroma(
                persist_directory="chroma_db",
                embedding_function=embedding_model
            )

        print("ADDING DOCUMENTS TO CHROMA...")

        vectorstore.add_documents(docs)

        print("\n========== PDF INDEXED SUCCESSFULLY ==========")
        print(f"Chunks Created: {len(docs)}")
        print("==============================================\n")

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

def bm25_search(query, top_k=3):

    global all_chunks

    if len(all_chunks) == 0:

        return []

    tokenized_chunks = [
        chunk.lower().split()
        for chunk in all_chunks
    ]

    bm25 = BM25Okapi(tokenized_chunks)

    tokenized_query = query.lower().split()

    scores = bm25.get_scores(tokenized_query)

    ranked_indices = sorted(
        range(len(scores)),
        key=lambda i: scores[i],
        reverse=True
    )

    results = []

    for idx in ranked_indices[:top_k]:

        results.append(all_chunks[idx])

    return results

# -----------------------------------------
# FOLLOW-UP QUERY REWRITING
# -----------------------------------------

def rewrite_followup_query(query):

    global last_pdf_topic

    query_lower = query.lower().strip()

    followup_phrases = [
        "explain it",
        "explain about it",
        "tell me more",
        "describe it",
        "what is it",
        "elaborate",
        "explain more",
        "give more details",
        "explain about this",
        "describe this",
        "more about this",
        "what about this"
    ]

    for phrase in followup_phrases:

        if phrase in query_lower:

            if last_pdf_topic != "":

                rewritten = (
                    query
                    + " regarding "
                    + last_pdf_topic
                )

                print(
                    f"REWRITTEN QUERY: {rewritten}"
                )

                return rewritten

    return query


# -----------------------------------------
# QUIZ GENERATION
# -----------------------------------------

@app.post("/generate-quiz")
async def generate_quiz():

    try:

        print("\n========== GENERATING QUIZ ==========")

        global vectorstore

        if vectorstore is None:

            vectorstore = Chroma(
                persist_directory="chroma_db",
                embedding_function=embedding_model
            )

        docs = vectorstore.similarity_search(
            "important concepts topics quiz questions",
            k=12
        )

        context_parts = []

        seen = set()

        for doc in docs:

            text = " ".join(
                doc.page_content.split()
            )

            if (
                len(text) > 80
                and text not in seen
            ):

                context_parts.append(text)

                seen.add(text)

        context = "\n\n".join(context_parts)

        if context.strip() == "":

            return {
                "quiz":
                "No PDF content found."
            }

        messages = [
            {
                "role": "system",
                "content": """
You are MinAI, an AI educational assistant.

Generate:
- 5 multiple choice questions
- 4 options per question
- correct answer
- short explanation

ONLY using the provided document context.

Format clearly using markdown.

Example:

## Question 1
What is ...?

A) ...
B) ...
C) ...
D) ...

**Answer:** B

**Explanation:** ...
"""
            },
            {
                "role": "user",
                "content": f"""
Document Context:
{context}

Generate a quiz from the document.
"""
            }
        ]

        response_text = generate_ai_response(
            messages
        )

        if (
            response_text is None
            or response_text.strip() == ""
        ):

            response_text = (
                "Could not generate quiz."
            )

        print("\n========== QUIZ GENERATED ==========")

        return {
            "quiz": response_text
        }

    except Exception as e:

        print("\n========== QUIZ ERROR ==========")
        print(str(e))
        print("==================================\n")

        return {
            "error": str(e)
        }

# -----------------------------------------
# FLASHCARD GENERATION
# -----------------------------------------

@app.post("/generate-flashcards")
async def generate_flashcards():

    try:

        print("\n========== GENERATING FLASHCARDS ==========")

        global vectorstore

        if vectorstore is None:

            vectorstore = Chroma(
                persist_directory="chroma_db",
                embedding_function=embedding_model
            )

        docs = vectorstore.similarity_search(
            "important concepts definitions flashcards",
            k=12
        )

        context_parts = []

        seen = set()

        for doc in docs:

            text = " ".join(
                doc.page_content.split()
            )

            if (
                len(text) > 80
                and text not in seen
            ):

                context_parts.append(text)

                seen.add(text)

        context = "\n\n".join(context_parts)

        if context.strip() == "":

            return {
                "flashcards":
                "No PDF content found."
            }

        messages = [
            {
                "role": "system",
                "content": """
You are MinAI, an AI educational assistant.

Generate:
- concise study flashcards
- question and answer pairs
- important definitions
- key concepts

ONLY using the provided document context.

Format using markdown.

Example:

## Flashcard 1
Q: What is Machine Learning?

A: Machine Learning is...

## Flashcard 2
Q: What is clustering?

A: Clustering is...
"""
            },
            {
                "role": "user",
                "content": f"""
Document Context:
{context}

Generate flashcards from the document.
"""
            }
        ]

        response_text = generate_ai_response(
            messages
        )

        if (
            response_text is None
            or response_text.strip() == ""
        ):

            response_text = (
                "Could not generate flashcards."
            )

        print("\n========== FLASHCARDS GENERATED ==========")

        return {
            "flashcards": response_text
        }

    except Exception as e:

        print("\n========== FLASHCARD ERROR ==========")
        print(str(e))
        print("========================================\n")

        return {
            "error": str(e)
        }

@app.post("/generate-summary")
async def generate_summary():

    try:

        print("\n========== GENERATING SUMMARY ==========")

        # Load Vector DB
        global vectorstore
 
        if vectorstore is None:

            vectorstore = Chroma(
                persist_directory="chroma_db",
                embedding_function=embedding_model
            )

        # Retrieve larger context
        docs = vectorstore.similarity_search(
            "important topics concepts summary",
            k=12
        )

        context_parts = []

        seen = set()

        for doc in docs:

            text = " ".join(
                doc.page_content.split()
            )

            if (
                len(text) > 80
                and text not in seen
            ):

                context_parts.append(text)

                seen.add(text)

        context = "\n\n".join(context_parts)

        if context.strip() == "":

            return {
                "summary":
                "No PDF content found."
            }

        messages = [
            {
                "role": "system",
                "content": """
You are MinAI, an educational AI assistant.

Generate:
- concise study notes
- key concepts
- important topics
- educational summary

ONLY from the provided document context.

Keep the summary:
- well structured
- student friendly
- concise but informative
"""
            },
            {
                "role": "user",
                "content": f"""
Document Context:
{context}

Generate a clean educational summary.
"""
            }
        ]

        response_text = generate_ai_response(
            messages
        )

        if (
            response_text is None
            or response_text.strip() == ""
        ):

            response_text = (
                "Could not generate summary."
            )

        print("\n========== SUMMARY GENERATED ==========")

        return {
            "summary": response_text
        }

    except Exception as e:

        print("\n========== SUMMARY ERROR ==========")
        print(str(e))
        print("=====================================\n")

        return {
            "error": str(e)
        }


# -----------------------------------------
# PDF RAG CHAT
# -----------------------------------------

@app.post("/ask-pdf")
async def ask_pdf(req: ChatRequest):

    try:

        print("\n========== PDF QUESTION ==========")
        print(req.message)

        # -----------------------------------------
        # LOAD VECTOR DB
        # -----------------------------------------

        vectorstore = Chroma(
            persist_directory="chroma_db",
            embedding_function=embedding_model
        )

        rewritten_query = rewrite_followup_query(
            req.message
        )

        normalized_query = (
            rewritten_query.lower().strip()
        )

        print(f"FINAL QUERY: {normalized_query}")

        # -----------------------------------------
        # SEMANTIC SEARCH
        # -----------------------------------------

        docs_with_scores = vectorstore.similarity_search_with_score(
            normalized_query,
            k=6
        )

        # -----------------------------------------
        # BM25 SEARCH
        # -----------------------------------------

        bm25_results = bm25_search(
            normalized_query,
            top_k=6
        )

        print(
            f"RETRIEVED CHUNKS: {len(docs_with_scores)}"
        )

        context_parts = []

        seen_chunks = set()

        sources = []

        # -----------------------------------------
        # VECTOR RESULTS
        # -----------------------------------------

        for doc, score in docs_with_scores:

            text = doc.page_content.strip()

            # Ignore weak semantic matches
            if score > 1.6:
                continue

            # Ignore tiny/noisy chunks
            if len(text) < 80:
                continue

            cleaned_text = " ".join(
                text.split()
            )

            if cleaned_text not in seen_chunks:

                context_parts.append(cleaned_text)

                seen_chunks.add(cleaned_text)

            page = doc.metadata.get(
                "page",
                "Unknown"
            )

            if page != "Unknown":

                page = page + 1
            pdf_name = doc.metadata.get(
                "source",
                "Unknown PDF"
            )

            sources.append(
                f"{pdf_name} - Page {page}"
            )

        # -----------------------------------------
        # BM25 RESULTS
        # -----------------------------------------

        for text in bm25_results:

            cleaned = " ".join(
                text.strip().split()
            )

            # Ignore tiny chunks
            if len(cleaned) < 80:
                continue

            # Ignore duplicate chunks
            if cleaned in seen_chunks:
                continue

            # Lightweight relevance filtering
            query_words = set(
                normalized_query.split()
            )

            chunk_words = set(
                cleaned.lower().split()
            )

            overlap = len(
                query_words.intersection(
                    chunk_words
                )
            )

            # Skip irrelevant keyword matches
            if overlap == 0:
                continue

            context_parts.append(cleaned)

            seen_chunks.add(cleaned)

        # -----------------------------------------
        # FINAL CONTEXT
        # -----------------------------------------

        context = "\n\n".join(context_parts)

        print("\n========== RETRIEVED CONTEXT ==========")
        print(context[:1500])
        print("=======================================\n")

        # -----------------------------------------
        # STRICT GROUNDING CHECK
        # -----------------------------------------

        if len(context_parts) == 0:

            return {
                "response":
                "The requested information is not present in the uploaded document.",
                "sources": []
            }

        # -----------------------------------------
        # AI PROMPT
        # -----------------------------------------

        messages = [
            {
                "role": "system",
                "content": """
You are MinAI, an educational AI assistant specialized in answering questions ONLY from uploaded PDF documents.

STRICT RULES:
- Use ONLY the provided document context
- NEVER use outside knowledge
- NEVER invent facts not present in the context
- If relevant information exists in the context, explain it clearly and educationally
- You ARE allowed to summarize, paraphrase, simplify, and explain retrieved content
- Do NOT refuse if the concept exists in the retrieved context
- ONLY refuse when the retrieved context truly contains no relevant information

If no relevant information exists, respond EXACTLY with:

"The requested information is not present in the uploaded document."

Always:
- answer in English
- be educational
- be concise but informative
"""
            },
            {
                "role": "user",
                "content": f"""
Question:
{req.message}

Document Context:
{context}

Answer ONLY using the document context.
"""
            }
        ]

        # -----------------------------------------
        # GENERATE RESPONSE
        # -----------------------------------------

        response_text = generate_ai_response(
            messages
        )

        # -----------------------------------------
        # STORE CONVERSATION MEMORY
        # -----------------------------------------

        global last_pdf_topic

        if response_text is not None:

            cleaned_response = (
                response_text
                .replace("\n", " ")
                .strip()
            )

            if (
                "not present in the uploaded document"
                not in cleaned_response.lower()
            ):

                memory_candidate = cleaned_response

                # Limit memory size
                if len(memory_candidate) > 150:

                    memory_candidate = (
                        memory_candidate[:150]
                    )

                last_pdf_topic = memory_candidate

                print(
                    f"LAST PDF MEMORY: {last_pdf_topic}"
                )

        # -----------------------------------------
        # FALLBACK
        # -----------------------------------------

        if (
            response_text is None
            or response_text.strip() == ""
        ):

            response_text = (
                "The AI model could not generate "
                "a grounded answer from the document."
            )

        print("\n========== FINAL RESPONSE ==========")
        print(response_text)
        print("====================================\n")

        return {
            "response": response_text,
            "sources": list(set(sources))
        }

    except Exception as e:

        print("\n========== RAG ERROR ==========")
        print(str(e))
        print("================================\n")

        return {
            "error": str(e)
        }