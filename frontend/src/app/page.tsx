"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function Home() {

  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState<any[]>([
    {
      role: "assistant",
      content:
        "Welcome to MinAI.\n\nUpload PDFs and chat with your documents using AI.",
    },
  ]);

  const [loading, setLoading] = useState(false);

  const [uploading, setUploading] = useState(false);

  const [chatMode, setChatMode] = useState("pdf");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });

  }, [messages, loading]);

  // Normal Chat
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
        "http://127.0.0.1:8000/chat",
        {
          message: currentMessage,
        }
      );

      const aiMessage = {
        role: "assistant",
        content: response.data.response,
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

  // Upload PDF
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

  // Ask PDF
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
        "http://127.0.0.1:8000/ask-pdf",
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
    <main className="flex h-screen bg-[#0A0A0A] text-white overflow-hidden">

      {/* Sidebar */}
      <aside className="w-72 border-r border-[#1A1A1A] bg-[#0D0D0D] flex flex-col">

        <div className="p-6 border-b border-[#1A1A1A]">

          <h1 className="text-3xl font-semibold">
            MinAI
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Intelligent AI Workspace
          </p>

        </div>

        {/* Upload */}
        <div className="p-4 space-y-3">

          <label className="block cursor-pointer">

            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={uploadPDF}
            />

            <div className="w-full bg-[#1A1A1A] hover:bg-[#222222] border border-[#2A2A2A] rounded-2xl py-3 text-sm font-medium text-center transition-all">

              {uploading
                ? "Uploading PDF..."
                : "Upload PDF"}

            </div>

          </label>

        </div>

        {/* Sidebar Cards */}
        <div className="flex-1 overflow-y-auto px-4 space-y-3">

          <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-4">

            <h3 className="font-medium text-sm">
              PDF RAG System
            </h3>

            <p className="text-xs text-gray-500 mt-2">
              Semantic document intelligence
            </p>

          </div>

          <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-4">

            <h3 className="font-medium text-sm">
              AI Workspace
            </h3>

            <p className="text-xs text-gray-500 mt-2">
              Chat with uploaded files
            </p>

          </div>

        </div>

        <div className="p-4 border-t border-[#1A1A1A] text-xs text-gray-600">
          MinAI v1.0
        </div>

      </aside>

      {/* Main */}
      <section className="flex-1 flex flex-col">

        {/* Navbar */}
        <div className="h-16 border-b border-[#1A1A1A] bg-[#0D0D0D] flex items-center justify-between px-6">

          <h2 className="text-sm text-gray-400">
            AI Document Workspace
          </h2>

          <div className="text-xs text-gray-600">
            RAG Enabled
          </div>

        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6">

          {messages.map((msg, index) => (

            <div
              key={index}
              className={`max-w-3xl ${
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

                  <div>

                    <p className="leading-8 whitespace-pre-wrap text-[15px]">
                      {msg.content || "No response available."}
                    </p>

                    {msg.sources && msg.sources.length > 0 && (

                      <div className="mt-5 flex flex-wrap gap-2">

                        {msg.sources.map((source: string, i: number) => (

                          <div
                            key={i}
                            className="bg-[#1A1A1A] border border-[#2A2A2A] px-3 py-1 rounded-xl text-xs text-gray-300"
                          >
                            {source}
                          </div>

                        ))}

                      </div>

                    )}

                  </div>

                )}

              </div>

            </div>

          ))}

          {loading && (

            <div className="max-w-3xl">

              <div className="bg-[#111111] border border-[#1F1F1F] rounded-3xl px-6 py-5">

                <p className="text-gray-400 animate-pulse">
                  MinAI is analyzing your request...
                </p>

              </div>

            </div>

          )}

          <div ref={messagesEndRef} />

        </div>

        {/* Chat Mode Toggle */}
        <div className="px-8 pb-4 flex gap-3">

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

          <div className="flex items-center gap-4">

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
              className="flex-1 bg-[#111111] border border-[#1F1F1F] focus:border-[#333333] rounded-3xl px-6 py-4 outline-none text-white placeholder:text-gray-500"
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
              className="bg-[#F5F5F5] text-black hover:opacity-90 transition-all px-8 py-4 rounded-3xl font-medium disabled:opacity-50"
            >
              {chatMode === "pdf"
                ? "Ask PDF"
                : "Send"}
            </button>

          </div>

        </div>

      </section>

    </main>
  );
}