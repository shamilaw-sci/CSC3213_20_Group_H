"use client";

import { useEffect, useRef, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import api from "../../services/api";
import { ChatMessage } from "../../types/ChatMessage";

function ChatPageContent() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await api.get("/chat");
        setMessages(response.data.messages || []);
      } catch (err) {
        setError("Couldn't load your previous conversation.");
      } finally {
        setLoadingHistory(false);
      }
    };

    loadHistory();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setInput("");
    setError("");
    setLoading(true);
    setMessages((prev) => [...prev, { sender: "patient", content: trimmed }]);

    try {
      const response = await api.post("/chat", { message: trimmed });
      const [, botMessage] = response.data.messages as ChatMessage[];
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      setError("Something went wrong sending that. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-6 flex flex-col h-[calc(100vh-6rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">CareBridge Companion</h1>
        <p className="text-sm text-gray-500">
          A supportive space to talk things through. This isn't a replacement
          for a real counsellor — if you're in crisis, use the Emergency Help
          button.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        {loadingHistory ? (
          <p className="text-gray-400 text-sm">Loading conversation...</p>
        ) : messages.length === 0 ? (
          <p className="text-gray-400 text-sm">
            Hi, I'm here to listen. What's on your mind today?
          </p>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={`${msg.id ?? "message"}-${idx}`}
              className={`flex ${
                msg.sender === "patient" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                  msg.sender === "patient"
                    ? "bg-blue-600 text-white"
                    : msg.crisisFlag
                      ? "bg-red-50 border border-red-200 text-red-900"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[75%] rounded-2xl px-4 py-2 text-sm bg-gray-100 text-gray-500">
              Typing...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="mt-2 rounded-lg bg-red-50 border border-red-200 p-2 text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type how you're feeling..."
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </main>
  );
}

export default function ChatPage() {
  return (
    <AuthGuard>
      <ChatPageContent />
    </AuthGuard>
  );
}
