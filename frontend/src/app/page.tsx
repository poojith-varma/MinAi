"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { useDropzone } from "react-dropzone";

import Flashcard from "@/components/Flashcard";

import ExportNotes from "@/components/ExportNotes";

import { useReactToPrint } from "react-to-print";

const BACKEND_URL = "http://127.0.0.1:8000";

export default function Home() {

  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState<any[]>([
    {
      role: "assistant",
      content:
        "# Welcome to MinAI 🚀\n\nUpload PDFs and chat with your documents using AI.\n\n- Semantic Search\n- AI Document Q&A\n- Multi-PDF RAG Workspace",
    },
  ]);

  const [loading, setLoading] = useState(false);

  const [summaryLoading, setSummaryLoading] =
  useState(false);

  const [quizLoading, setQuizLoading] =
  useState(false);

  const [flashcardLoading, setFlashcardLoading] =
  useState(false);

  const [uploading, setUploading] = useState(false);

  const [chatMode, setChatMode] = useState("pdf");

  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const exportRef =
  useRef<HTMLDivElement>(null);

  const handlePrint =
  useReactToPrint({
    contentRef: exportRef,

    documentTitle:
      "MinAI_Study_Notes",

    pageStyle: `
      @page {
        size: auto;
        margin: 20mm;
      }

      @media print {

        html, body {
          height: initial !important;
          overflow: initial !important;
          -webkit-print-color-adjust: exact;
        }

      }
    `,
  });

const exportNotes = async () => {

  setShowExport(true);

  setTimeout(() => {

    handlePrint();

    setTimeout(() => {

      setShowExport(false);

    }, 1000);

  }, 500);

};

const [showExport, setShowExport] =
  useState(false);

  // -----------------------------------------
  // DRAG & DROP PDF
  // -----------------------------------------
  const onDrop = async (
    acceptedFiles: File[]
  ) => {

    const file = acceptedFiles[0];

    if (!file) return;

    const formData = new FormData();

    formData.append("file", file);

    setUploading(true);

    try {

      const response = await axios.post(
        `${BACKEND_URL}/upload-pdf`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Save uploaded file
      setUploadedFiles((prev) => [
        ...prev,
        {
          name: file.name,
          chunks: response.data.chunks,
          url: URL.createObjectURL(file),
        },
      ]);

      // Add chat card
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          type: "file",
          fileName: file.name,
          chunks: response.data.chunks,
          content: "PDF uploaded successfully.",
        },
      ]);

    } catch {

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "PDF upload failed.",
        },
      ]);

    }

    setUploading(false);

  };

  const {
    getRootProps,
    getInputProps,
    isDragActive,
  } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    multiple: false,
  });

  // -----------------------------------------
  // COPY BUTTON
  // -----------------------------------------
  const copyToClipboard = async (
    text: string
  ) => {

    try {

      await navigator.clipboard.writeText(text);

    } catch (error) {

      console.error("Copy failed", error);

    }

  };

  // -----------------------------------------
  // AUTO SCROLL
  // -----------------------------------------
//
// LOAD SAVED DATA
//
useEffect(() => {

  const savedMessages =
    localStorage.getItem("minai_messages");

  const savedFiles =
    localStorage.getItem("minai_uploaded_files");

  if (savedMessages) {

    setMessages(JSON.parse(savedMessages));

  }

  if (savedFiles) {

    setUploadedFiles(JSON.parse(savedFiles));

  }

}, []);

//
// AUTO SCROLL + SAVE DATA
//
useEffect(() => {

  messagesEndRef.current?.scrollIntoView({
    behavior: "smooth",
  });

  // Save Messages
  localStorage.setItem(
    "minai_messages",
    JSON.stringify(messages)
  );

  // Save Uploaded Files
  localStorage.setItem(
    "minai_uploaded_files",
    JSON.stringify(uploadedFiles)
  );

}, [messages, loading, uploadedFiles]);

const generateSummary = async () => {

  try {

    setSummaryLoading(true);

    const response = await axios.post(
      `${BACKEND_URL}/generate-summary`
    );

    const summaryMessage = {
      role: "assistant",
      content: response.data.summary,
      type: "summary",
    };

    setMessages((prev: any) => [
      ...prev,
      summaryMessage,
    ]);

  } catch (error) {

    console.error(error);

    const errorMessage = {
      role: "assistant",
      content:
        "Failed to generate summary.",
      type: "summary",
    };

    setMessages((prev: any) => [
      ...prev,
      errorMessage,
    ]);

  } finally {

    setSummaryLoading(false);
  }
};

const generateQuiz = async () => {

  try {

    setQuizLoading(true);

    const response = await axios.post(
      `${BACKEND_URL}/generate-quiz`
    );

    const quizMessage = {
      role: "assistant",
      content: response.data.quiz,
      type: "quiz",
    };

    setMessages((prev: any) => [
      ...prev,
      quizMessage,
    ]);

  } catch (error) {

    console.error(error);

    const errorMessage = {
      role: "assistant",
      content:
        "Failed to generate quiz.",
      type: "quiz",
    };

    setMessages((prev: any) => [
      ...prev,
      errorMessage,
    ]);

  } finally {

    setQuizLoading(false);
  }
};

const generateFlashcards = async () => {

  try {

    setFlashcardLoading(true);

    const response = await axios.post(
      `${BACKEND_URL}/generate-flashcards`
    );

    const flashcardMessage = {
      role: "assistant",
      content: response.data.flashcards,
      type: "flashcards",
    };

    setMessages((prev: any) => [
      ...prev,
      flashcardMessage,
    ]);

  } catch (error) {

    console.error(error);

    const errorMessage = {
      role: "assistant",
      content:
        "Failed to generate flashcards.",
      type: "flashcards",
    };

    setMessages((prev: any) => [
      ...prev,
      errorMessage,
    ]);

  } finally {

    setFlashcardLoading(false);
  }
};



  // -----------------------------------------
  // NORMAL CHAT
  // -----------------------------------------
  const sendMessage = async () => {

    if (!message.trim() || loading) return;

    const userMessage = {
      role: "user",
      content: message,
    };

    setMessages((prev) => [...prev, userMessage]);

    const currentMessage = message;

    setMessage("");

    setLoading(true);

    try {

      const response = await axios.post(
        `${BACKEND_URL}/chat`,
        {
          message: currentMessage,
        }
      );

      const aiMessage = {
        role: "assistant",
        content:
          response.data.response ||
          "No response generated.",
      };

      setMessages((prev) => [...prev, aiMessage]);

    } catch {

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Failed to contact AI server.",
        },
      ]);

    }

    setLoading(false);
  };

  // -----------------------------------------
  // MANUAL PDF UPLOAD
  // -----------------------------------------
  const uploadPDF = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {

    const file = e.target.files?.[0];

    if (!file) return;

    const formData = new FormData();

    formData.append("file", file);

    setUploading(true);

    try {

      const response = await axios.post(
        "http://127.0.0.1:8000/upload-pdf",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Save uploaded file
      setUploadedFiles((prev) => [
        ...prev,
        {
          name: file.name,
          chunks: response.data.chunks,
          url: URL.createObjectURL(file),
        },
      ]);

      // Chat message
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          type: "file",
          fileName: file.name,
          chunks: response.data.chunks,
          content: "PDF uploaded successfully.",
        },
      ]);

    } catch {

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "PDF upload failed.",
        },
      ]);

    }

    setUploading(false);
  };

  // -----------------------------------------
  // ASK PDF
  // -----------------------------------------
  const askPDF = async () => {

    if (!message.trim() || loading) return;

    const userMessage = {
      role: "user",
      content: message,
    };

    setMessages((prev) => [...prev, userMessage]);

    const currentMessage = message;

    setMessage("");

    setLoading(true);

    try {

      const response = await axios.post(
        `${BACKEND_URL}/ask-pdf`,
        {
          message: currentMessage,
        }
      );

      const aiMessage = {
        role: "assistant",
        content:
          response.data.response ||
          "No response generated.",
        sources:
          response.data.sources || [],
      };

      setMessages((prev) => [...prev, aiMessage]);

    } catch {

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Failed to query PDF.",
        },
      ]);

    }

    setLoading(false);
  };

  return (

   <>

     {/* Hidden Export Layout */}
{showExport && (

  <div
    ref={exportRef}
    className="
      bg-white
      text-black
      p-0
      m-0
    "
  >

    <ExportNotes
      messages={messages}
    />

  </div>

)}

    <main className="flex flex-col md:flex-row h-screen bg-[#0A0A0A] text-white overflow-hidden">

      {/* Sidebar */}
      <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r border-[#1A1A1A] bg-[#0D0D0D] flex flex-col max-h-[320px] md:max-h-full overflow-y-auto">

        {/* Logo */}
        <div className="p-6 border-b border-[#1A1A1A]">

          <h1 className="text-3xl font-semibold tracking-tight">
            MinAI
          </h1>

          <p className="text-sm text-[#666666] mt-1">
            Intelligent AI Workspace
          </p>

        </div>

        {/* Drag Upload */}
        <div className="p-4 space-y-3">

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
              isDragActive
                ? "border-white bg-[#151515]"
                : "border-[#2A2A2A] bg-[#111111] hover:bg-[#171717]"
            }`}
          >

            <input
  {...getInputProps()}
  id="pdf-upload"
  name="pdf-upload"
/>

            <div className="space-y-3">

              <div className="text-4xl">
                📄
              </div>

              <div>

                <p className="text-sm font-medium">

                  {uploading
                    ? "Uploading PDF..."
                    : isDragActive
                    ? "Drop PDF here"
                    : "Drag & Drop PDF"}

                </p>

                <p className="text-xs text-[#666666] mt-1">
                  or click to browse
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* Uploaded Documents */}
        <div className="px-4 space-y-3">

          <div className="text-xs uppercase tracking-wide text-[#666666] px-1">
            Documents
          </div>

          {uploadedFiles.length === 0 ? (

            <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-4 text-xs text-[#666666]">
              No PDFs uploaded yet
            </div>

          ) : (

            uploadedFiles.map((file, index) => (

              <div
                key={index}
                className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-4"
              >

                <div className="flex items-start gap-3">

                  <div className="text-xl">
                    📄
                  </div>

                  <div className="min-w-0">

                    <p className="text-sm font-medium truncate">
                      {file.name}
                    </p>

                    <p className="text-xs text-[#666666] mt-1">
                      {file.chunks} chunks indexed
                    </p>

                  </div>

                </div>

              </div>

            ))

          )}

        </div>

        {/* Sidebar Cards */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

          <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-4">

            <h3 className="font-medium text-sm">
              Multi-PDF RAG
            </h3>

            <p className="text-xs text-[#666666] mt-2">
              Semantic document intelligence
            </p>

          </div>

          <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-4">

            <h3 className="font-medium text-sm">
              AI Workspace
            </h3>

            <p className="text-xs text-[#666666] mt-2">
              Chat with multiple documents
            </p>

          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#1A1A1A] text-xs text-gray-600">
          MinAI v1.0
        </div>

      </aside>

      {/* Main */}
      <section className="flex-1 flex flex-col min-h-0">

        {/* Navbar */}
        <div className="h-16 border-b border-[#1A1A1A] bg-[#0D0D0D] flex items-center justify-between px-6">

          <h2 className="text-sm text-gray-400">
            AI Document Workspace
          </h2>

          <div className="flex items-center gap-3">

  <div className="text-xs text-gray-600">
    Multi-Document RAG Enabled
  </div>

  <button
    onClick={generateSummary}
    disabled={summaryLoading}
    className="
      text-xs
      bg-purple-600
      hover:bg-purple-700
      px-3
      py-1
      rounded-xl
      transition-all
      disabled:opacity-50
    "
  >
    {
      summaryLoading
        ? "Generating..."
        : "Generate Summary"
    }
  </button>

  <button
    onClick={generateQuiz}
    disabled={quizLoading}
    className="
      text-xs
      bg-blue-600
      hover:bg-blue-700
      px-3
      py-1
      rounded-xl
      transition-all
      disabled:opacity-50
    "
  >
    {
      quizLoading
        ? "Generating..."
        : "Generate Quiz"
    }
  </button>

  <button
    onClick={generateFlashcards}
    disabled={flashcardLoading}
    className="
      text-xs
      bg-green-600
      hover:bg-green-700
      px-3
      py-1
      rounded-xl
      transition-all
      disabled:opacity-50
    "
  >
    {
      flashcardLoading
        ? "Generating..."
        : "Generate Flashcards"
    }
  </button>


  <button
  onClick={exportNotes}
  className="
    text-xs
    bg-orange-600
    hover:bg-orange-700
    px-3
    py-1
    rounded-xl
    transition-all
  "
>
  Export Notes
</button>
  

  <button
    onClick={() => {

      localStorage.removeItem("minai_messages");

      localStorage.removeItem(
        "minai_uploaded_files"
      );

      setMessages([
        {
          role: "assistant",
          content:
            "# Welcome to MinAI 🚀\n\nUpload PDFs and chat with your documents using AI.",
        },
      ]);

      setUploadedFiles([]);

    }}
    className="text-xs bg-[#111111] border border-[#1F1F1F] hover:bg-[#1A1A1A] px-3 py-1 rounded-xl transition-all"
  >
    Clear Chat
  </button>

</div>
        </div>

        {/* Messages */}
<div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-8 space-y-6">

          {messages.map((msg, index) => (

            <div
              key={index}
              className={`max-w-4xl ${
                msg.role === "user"
                  ? "ml-auto"
                  : ""
              }`}
            >

              <div
                className={`rounded-3xl px-6 py-5 ${
                  msg.role === "user"
                    ? "bg-[#F5F5F5] text-black"
                    : "bg-[#111111] border border-[#1F1F1F]"
                }`}
              >

                {/* File Card */}
                {msg.type === "file" ? (

                  <div className="flex items-center gap-4">

                    <div className="w-14 h-14 rounded-2xl bg-[#1F1F1F] flex items-center justify-center text-2xl">
                      📄
                    </div>

                    <div>

                      <h3 className="font-medium text-white">
                        {msg.fileName}
                      </h3>

                      <p className="text-sm text-gray-400 mt-1">
                        Indexed {msg.chunks} semantic chunks
                      </p>

                    </div>

                  </div>

                ) : (

                  <div className="space-y-4">

                    {/* Assistant Header */}
                    {msg.role === "assistant" && (

                      <div className="flex items-center justify-between">

                        <div className="text-xs text-[#666666]">
                          MinAI Response
                        </div>

                        <button
                          onClick={() =>
                            copyToClipboard(msg.content)
                          }
                          className="text-xs bg-[#1A1A1A] hover:bg-[#222222] border border-[#2A2A2A] px-3 py-1 rounded-xl transition-all"
                        >
                          Copy
                        </button>

                      </div>

                    )}

                    {/* Markdown */}
                    <div className="prose prose-invert max-w-none prose-pre:bg-[#1A1A1A] prose-pre:border prose-pre:border-[#2A2A2A] prose-pre:rounded-2xl prose-code:text-gray-200">

                      {msg.type === "flashcards" ? (

  <Flashcard
    content={msg.content}
  />

) : (

  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
  >
    {msg.content || "No response available."}
  </ReactMarkdown>

)}

                    </div>

                    {/* Sources */}
{msg.sources && msg.sources.length > 0 && (

  <div className="mt-5 flex flex-wrap gap-2">

    {msg.sources.map(
      (source: string, i: number) => {

        // Extract page number
        const match = source.match(/\d+/);

        const pageNumber = match
          ? parseInt(match[0])
          : 1;

        // First uploaded PDF
        const pdfFile =
          uploadedFiles.length > 0
            ? uploadedFiles[0]
            : null;

        return (

          <button
            key={i}
            onClick={() => {

              if (pdfFile?.url) {

                window.open(
                  `${pdfFile.url}#page=${pageNumber}`,
                  "_blank"
                );

              }

            }}
            className="
              bg-[#1A1A1A]
              border
              border-[#2A2A2A]
              px-3
              py-1
              rounded-xl
              text-xs
              text-gray-300
              hover:bg-[#222222]
              transition-all
            "
          >
            📄 {source}
          </button>

        );

      }
    )}

  </div>

)}

                  </div>

                )}

              </div>

            </div>

          ))}

          {/* Loading */}
          {loading && (

            <div className="max-w-3xl animate-in fade-in duration-300">

              <div className="bg-[#111111] border border-[#1F1F1F] rounded-3xl px-6 py-5">

                <div className="flex items-center gap-3">

                  <div className="flex gap-1">

                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>

                    <div
                      className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: "0.15s" }}
                    ></div>

                    <div
                      className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                      style={{ animationDelay: "0.3s" }}
                    ></div>

                  </div>

                  <p className="text-gray-400 text-sm">
                    MinAI is thinking...
                  </p>

                </div>

              </div>

            </div>

          )}

          <div ref={messagesEndRef} />

        </div>

        {/* Mode Toggle */}
        <div className="px-4 md:px-8 pb-4 flex flex-wrap gap-3">

          <button
            onClick={() => setChatMode("pdf")}
            className={`px-5 py-2 rounded-2xl text-sm transition-all ${
              chatMode === "pdf"
                ? "bg-[#F5F5F5] text-black"
                : "bg-[#111111] border border-[#1F1F1F]"
            }`}
          >
            PDF Chat
          </button>

          <button
            onClick={() => setChatMode("normal")}
            className={`px-5 py-2 rounded-2xl text-sm transition-all ${
              chatMode === "normal"
                ? "bg-[#F5F5F5] text-black"
                : "bg-[#111111] border border-[#1F1F1F]"
            }`}
          >
            Normal Chat
          </button>

        </div>

        {/* Input */}
        <div className="border-t border-[#1A1A1A] bg-[#0D0D0D] p-6">

          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">

            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {

                if (e.key === "Enter") {

                  if (chatMode === "pdf") {
                    askPDF();
                  } else {
                    sendMessage();
                  }

                }

              }}
              placeholder={
                chatMode === "pdf"
                  ? "Ask questions about uploaded PDFs..."
                  : "Ask MinAI anything..."
              }
              className="flex-1 bg-[#111111] border border-[#1F1F1F] focus:border-[#333333] rounded-3xl px-6 py-4 outline-none text-white placeholder:text-[#666666]"
            />

            <button
              onClick={() => {

                if (chatMode === "pdf") {
                  askPDF();
                } else {
                  sendMessage();
                }

              }}
              disabled={loading}
              className="bg-[#F5F5F5] text-black hover:opacity-90 transition-all px-8 py-4 rounded-3xl font-medium disabled:opacity-50 w-full md:w-auto"            >
              {chatMode === "pdf"
                ? "Ask PDF"
                : "Send"}
            </button>

          </div>

        </div>

      </section>

    </main>
    </>
  );
}