"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function Home() {

  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Welcome to MinAI.\n\nUpload files, research documents, and interact with your intelligent AI workspace.",
    },
  ]);

  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });

  }, [messages, loading]);

  const sendMessage = async () => {

    if (!message.trim() || loading) return;

    const userMessage = {
      role: "user",
      content: message,
    };

    setMessages((prev: any) => [...prev, userMessage]);

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

      setMessages((prev: any) => [...prev, aiMessage]);

    } catch (error) {

      setMessages((prev: any) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong while contacting the AI server.",
        },
      ]);

    }

    setLoading(false);
  };

  return (
    <main className="flex h-screen bg-[#0A0A0A] text-white overflow-hidden">

      {/* Sidebar */}
      <aside className="w-72 border-r border-[#1A1A1A] bg-[#0D0D0D] flex flex-col">

        {/* Logo */}
        <div className="p-6 border-b border-[#1A1A1A]">

          <h1 className="text-3xl font-semibold tracking-tight text-white">
            MinAI
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Intelligent AI Workspace
          </p>

        </div>

        {/* Workspace Button */}
        <div className="p-4">

          <button className="w-full bg-[#1A1A1A] hover:bg-[#222222] transition-all border border-[#2A2A2A] rounded-2xl py-3 text-sm font-medium">
            + New Workspace
          </button>

        </div>

        {/* Workspace List */}
        <div className="flex-1 overflow-y-auto px-4 space-y-3">

          <div className="bg-[#111111] border border-[#1F1F1F] hover:border-[#333333] transition-all rounded-2xl p-4 cursor-pointer">

            <h3 className="font-medium text-sm">
              DBMS Research
            </h3>

            <p className="text-xs text-gray-500 mt-2">
              2 PDFs uploaded
            </p>

          </div>

          <div className="bg-[#111111] border border-[#1F1F1F] hover:border-[#333333] transition-all rounded-2xl p-4 cursor-pointer">

            <h3 className="font-medium text-sm">
              Resume Review
            </h3>

            <p className="text-xs text-gray-500 mt-2">
              AI suggestions generated
            </p>

          </div>

          <div className="bg-[#111111] border border-[#1F1F1F] hover:border-[#333333] transition-all rounded-2xl p-4 cursor-pointer">

            <h3 className="font-medium text-sm">
              AI Notes
            </h3>

            <p className="text-xs text-gray-500 mt-2">
              Study material workspace
            </p>

          </div>

        </div>

        {/* Bottom */}
        <div className="p-4 border-t border-[#1A1A1A] text-xs text-gray-600">
          MinAI v1.0
        </div>

      </aside>

      {/* Main Section */}
      <section className="flex-1 flex flex-col">

        {/* Navbar */}
        <div className="h-16 border-b border-[#1A1A1A] bg-[#0D0D0D]/80 backdrop-blur-xl flex items-center justify-between px-6">

          <h2 className="text-sm font-medium tracking-wide text-gray-300">
            AI Workspace
          </h2>

          <div className="text-xs text-gray-500">
            Powered by AI
          </div>

        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6">

          {messages.map((msg: any, index) => (

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

                <p className="leading-8 whitespace-pre-wrap text-[15px]">
                  {msg.content}
                </p>

              </div>

            </div>

          ))}

          {loading && (

            <div className="max-w-3xl">

              <div className="bg-[#111111] border border-[#1F1F1F] rounded-3xl px-6 py-5">

                <p className="text-gray-400 animate-pulse">
                  MinAI is analyzing your request...
This may take a few seconds.
                </p>

              </div>

            </div>

          )}

          <div ref={messagesEndRef} />

        </div>

        {/* Prompt Suggestions */}
        <div className="px-8 pb-4 flex gap-3 overflow-x-auto">

          <button className="bg-[#111111] border border-[#1F1F1F] hover:border-[#333333] transition-all px-4 py-2 rounded-2xl text-sm whitespace-nowrap">
            Summarize Document
          </button>

          <button className="bg-[#111111] border border-[#1F1F1F] hover:border-[#333333] transition-all px-4 py-2 rounded-2xl text-sm whitespace-nowrap">
            Explain Simply
          </button>

          <button className="bg-[#111111] border border-[#1F1F1F] hover:border-[#333333] transition-all px-4 py-2 rounded-2xl text-sm whitespace-nowrap">
            Extract Key Points
          </button>

          <button className="bg-[#111111] border border-[#1F1F1F] hover:border-[#333333] transition-all px-4 py-2 rounded-2xl text-sm whitespace-nowrap">
            Generate Report
          </button>

        </div>

        {/* Input Area */}
        <div className="border-t border-[#1A1A1A] bg-[#0D0D0D]/80 backdrop-blur-xl p-6">

          <div className="flex items-center gap-4">

            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}
              placeholder="Ask anything..."
              className="flex-1 bg-[#111111] border border-[#1F1F1F] focus:border-[#3A3A3A] transition-all rounded-3xl px-6 py-4 outline-none text-white placeholder:text-gray-500"
            />

            <button
              onClick={sendMessage}
              disabled={loading}
              className="bg-[#F5F5F5] text-black hover:opacity-90 transition-all px-8 py-4 rounded-3xl font-medium disabled:opacity-50"
            >
              Send
            </button>

          </div>

        </div>

      </section>

    </main>
  );
}