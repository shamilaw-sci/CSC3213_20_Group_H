"use client";

import { useEffect, useRef, useState } from "react";
import { ClipboardList, Mic, Plus, Volume2 } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import CrisisResourcesBanner from "@/components/CrisisResourcesBanner";
import GeminiLiveVoice from "@/components/GeminiLiveVoice";
import Phq9Screening from "@/components/Phq9Screening";
import api from "../../services/api";
import {
  ChatMessage,
  CrisisResources,
  RiskAssessmentSummary,
} from "../../types/ChatMessage";

type ConversationItem = {
  id: number;
  title: string;
  modality: string;
  currentRiskLevel: string;
  lastMessageAt: string;
};

function ChatPageContent() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");
  const [showPhq9, setShowPhq9] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [phq9Suggested, setPhq9Suggested] = useState(false);
  const [crisisResources, setCrisisResources] = useState<CrisisResources | null>(
    null
  );
  const [latestRisk, setLatestRisk] = useState<RiskAssessmentSummary | null>(
    null
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversationsAndMessages = async (targetConvId?: number | null) => {
    setLoadingHistory(true);
    setError("");
    try {
      const [convRes, histRes] = await Promise.all([
        api.get("/chat/conversations"),
        api.get("/chat", {
          params: targetConvId ? { conversationId: targetConvId } : undefined,
        }),
      ]);
      setConversations(convRes.data.conversations || []);
      setConversationId(histRes.data.conversationId || null);
      setMessages(histRes.data.messages || []);
      if (histRes.data.activePhq9) {
        setShowPhq9(true);
      }
      if (histRes.data.currentRiskLevel === "high") {
        setCrisisResources((prev) => prev || {
          disclaimer:
            "CareBridge provides supportive screening and cannot automatically contact emergency services on your behalf.",
          contacts: [
            { name: "National Mental Health Helpline (Sri Lanka)", number: "1926", availability: "24/7 toll-free" },
            { name: "CCCline Emotional Support", number: "1333", availability: "24/7 confidential support" },
            { name: "Sri Lanka Emergency Services", number: "119", availability: "Immediate emergency response" },
          ],
        });
      } else {
        setCrisisResources(null);
      }
    } catch {
      setError("Couldn't load your previous conversation.");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadConversationsAndMessages();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleStartNewConversation = async () => {
    try {
      const res = await api.post("/chat/conversations", {
        title: `Session ${new Date().toLocaleDateString()}`,
      });
      const newConvId = res.data.conversation?.id;
      await loadConversationsAndMessages(newConvId);
      setPhq9Suggested(false);
      setLatestRisk(null);
    } catch {
      setError("Could not create a new conversation.");
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setInput("");
    setError("");
    setLoading(true);
    setMessages((prev) => [
      ...prev,
      { sender: "patient", modality: "text", content: trimmed },
    ]);

    try {
      const response = await api.post("/chat", {
        message: trimmed,
        conversationId,
      });
      const [, botMessage] = response.data.messages as ChatMessage[];
      if (response.data.conversationId) {
        setConversationId(response.data.conversationId);
      }
      if (response.data.riskAssessment) {
        setLatestRisk(response.data.riskAssessment);
        if (response.data.riskAssessment.recommendPhq9) {
          setPhq9Suggested(true);
        }
      }
      if (response.data.crisisResources) {
        setCrisisResources(response.data.crisisResources);
      }
      setMessages((prev) => [...prev, botMessage]);
    } catch {
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
    <main className="max-w-4xl mx-auto p-4 sm:p-6 flex flex-col min-h-[calc(100vh-5rem)] gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            CareBridge Companion
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Support & early-screening assistant (English & සිංහල). Not a
            medical diagnosis or replacement for a licensed professional.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {conversations.length > 0 && (
            <select
              value={conversationId || ""}
              onChange={(e) =>
                loadConversationsAndMessages(Number(e.target.value))
              }
              aria-label="Select conversation session"
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700"
            >
              {conversations.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.id} — {c.title} ({c.modality})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleStartNewConversation}
            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Plus size={14} />
            New Chat
          </button>

          <button
            type="button"
            onClick={() => setShowPhq9((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            <ClipboardList size={14} />
            PHQ-9 Screening
          </button>

          <button
            type="button"
            onClick={() => setShowVoice((prev) => !prev)}
            className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
              showVoice
                ? "bg-blue-600 text-white"
                : "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            <Mic size={14} />
            Voice Live
          </button>
        </div>
      </div>

      {crisisResources && (
        <CrisisResourcesBanner
          resources={crisisResources}
          onDismiss={() => setCrisisResources(null)}
        />
      )}

      {phq9Suggested && !showPhq9 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs text-indigo-900">
          <span>
            Would you like to complete a brief 9-question{" "}
            <strong>PHQ-9 wellbeing check</strong> to help track how you've been
            feeling?
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowPhq9(true);
                setPhq9Suggested(false);
              }}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white hover:bg-indigo-700"
            >
              Start PHQ-9
            </button>
            <button
              type="button"
              onClick={() => setPhq9Suggested(false)}
              className="text-indigo-700 font-semibold hover:underline"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {showVoice && (
        <GeminiLiveVoice
          conversationId={conversationId}
          onClose={() => setShowVoice(false)}
          onTurnPersisted={(payload) => {
            if (payload.conversationId) {
              setConversationId(payload.conversationId);
            }
            if (payload.messages?.length) {
              setMessages((prev) => [...prev, ...payload.messages]);
            }
            if (payload.riskAssessment) {
              setLatestRisk(payload.riskAssessment);
            }
            if (payload.crisisResources) {
              setCrisisResources(payload.crisisResources);
            }
          }}
        />
      )}

      {showPhq9 && (
        <Phq9Screening
          conversationId={conversationId}
          onClose={() => setShowPhq9(false)}
          onCompleted={(res) => {
            if (res.crisisResources) {
              setCrisisResources(res.crisisResources);
            }
            setMessages((prev) => [
              ...prev,
              {
                sender: "bot",
                modality: "text",
                content: `Thank you for completing the PHQ-9 check-in. Your screening score is ${res.totalScore}/27 (${res.severityBand} range). Remember this is screening information, not a clinical diagnosis — if you'd like, we can talk through how you've been feeling or book time with a counsellor.`,
              },
            ]);
          }}
        />
      )}

      <div className="flex-1 min-h-[320px] overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        {loadingHistory ? (
          <p className="text-gray-400 text-sm">Loading conversation...</p>
        ) : messages.length === 0 ? (
          <p className="text-gray-400 text-sm">
            Hi, I&apos;m here to listen. What&apos;s on your mind today? (You
            can write in English or සිංහල, or use Voice Live.)
          </p>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={`${msg.id ?? "message"}-${idx}`}
              className={`flex flex-col ${
                msg.sender === "patient" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  msg.sender === "patient"
                    ? "bg-blue-600 text-white"
                    : msg.crisisFlag
                      ? "bg-red-50 border border-red-200 text-red-900"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                {msg.modality === "voice" && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide opacity-75 mb-1 mr-2">
                    <Volume2 size={10} /> Voice
                  </span>
                )}
                {msg.content}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[75%] rounded-2xl px-4 py-2 text-sm bg-gray-100 text-gray-500">
              Thinking...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {latestRisk && latestRisk.validatedRiskLevel === "moderate" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Talking with a real counsellor can be really helpful when distress
          feels persistent. You can schedule a session anytime under{" "}
          <a href="/booking" className="font-bold underline">
            Booking
          </a>
          , and a counsellor has been notified to follow up.
        </div>
      )}

      {error && (
        <div className="mt-1 rounded-lg bg-red-50 border border-red-200 p-2 text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-2 items-end">
        <button
          type="button"
          onClick={() => setShowVoice((prev) => !prev)}
          title="Toggle real-time Gemini Live voice"
          aria-label="Toggle voice input"
          className={`p-3 rounded-xl border transition-colors ${
            showVoice
              ? "bg-blue-600 border-blue-600 text-white"
              : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Mic size={18} />
        </button>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Share how you're feeling (English or සිංහල)..."
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
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
