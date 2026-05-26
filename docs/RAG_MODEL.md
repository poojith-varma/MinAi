# 🧠 MinAI RAG Architecture

# ❓ What is RAG?

RAG stands for:

# Retrieval-Augmented Generation

Instead of generating answers blindly, MinAI:

1️⃣ Retrieves relevant chunks from PDFs  
2️⃣ Builds grounded context  
3️⃣ Sends ONLY retrieved context to the LLM  

This reduces hallucinations.

---

# 🚀 MinAI RAG Pipeline

```text
User Question
      ↓
Query Rewriting
      ↓
Hybrid Retrieval
(Semantic + BM25)
      ↓
Relevant PDF Chunks Retrieved
      ↓
Context Filtering
      ↓
Grounded Prompt Creation
      ↓
LLM Response
      ↓
Source Citations
```

---

# 🔍 Hybrid Retrieval

MinAI combines:

## Semantic Vector Search
Using:
- HuggingFace Embeddings
- ChromaDB

## BM25 Keyword Search
Using:
- Rank BM25

This improves:
- semantic understanding
- keyword retrieval
- educational grounding

---

# 🧠 Multi-PDF RAG

MinAI supports:
- multi-document retrieval
- cross-document reasoning
- shared vector workspace

Example:

```text
Compare OS deadlocks with DBMS deadlocks.
```

---

# 🚨 Hallucination Prevention

If information is absent:

```text
"The requested information is not present in the uploaded document."
```

MinAI is instructed:
- NEVER use outside knowledge
- NEVER fabricate answers
