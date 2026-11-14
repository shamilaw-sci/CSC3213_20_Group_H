"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, History, Globe } from "lucide-react";
import api from "@/services/api";
import {
  CrisisResources,
  Phq9HistoryItem,
  Phq9Option,
  Phq9Question,
} from "@/types/ChatMessage";
import CrisisResourcesBanner from "./CrisisResourcesBanner";

interface Phq9ScreeningProps {
  conversationId?: number | null;
  onCompleted?: (result: {
    totalScore: number;
    severityBand: string;
    q9SafetyTriggered: boolean;
    crisisResources?: CrisisResources | null;
  }) => void;
  onClose?: () => void;
}

export default function Phq9Screening({
  conversationId,
  onCompleted,
  onClose,
}: Phq9ScreeningProps) {
  const [screeningId, setScreeningId] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Phq9Question | null>(null);
  const [options, setOptions] = useState<Phq9Option[]>([]);
  const [language, setLanguage] = useState<"en" | "si">("en");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completedResult, setCompletedResult] = useState<{
    totalScore: number;
    severityBand: string;
    q9SafetyTriggered: boolean;
    disclaimer: string;
  } | null>(null);
  const [crisisResources, setCrisisResources] = useState<CrisisResources | null>(null);
  const [history, setHistory] = useState<Phq9HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const loadHistory = async () => {
    try {
      const res = await api.get("/phq9/history");
      setHistory(res.data.screenings || []);
    } catch {
      // non-fatal
    }
  };

  const startOrResume = async (forceNew = false) => {
    setLoading(true);
    setError("");
    setCompletedResult(null);
    try {
      const res = await api.post("/phq9/start", {
        conversationId: conversationId || undefined,
        forceNew,
      });
      setScreeningId(res.data.screening.id);
      setCurrentQuestion(res.data.nextQuestion);
      setOptions(res.data.options || []);
      await loadHistory();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Could not start PHQ-9 screening.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startOrResume(false);
  }, []);

  const handleAnswer = async (value: number) => {
    if (!screeningId || !currentQuestion || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await api.post(`/phq9/${screeningId}/answer`, {
        questionNumber: currentQuestion.number,
        responseValue: value,
      });

      if (res.data.crisisResources) {
        setCrisisResources(res.data.crisisResources);
      }

      if (res.data.completed) {
        setCompletedResult({
          totalScore: res.data.totalScore,
          severityBand: res.data.severityBand,
          q9SafetyTriggered: res.data.q9SafetyTriggered,
          disclaimer: res.data.disclaimer,
        });
        setCurrentQuestion(null);
        await loadHistory();
        onCompleted?.({
          totalScore: res.data.totalScore,
          severityBand: res.data.severityBand,
          q9SafetyTriggered: res.data.q9SafetyTriggered,
          crisisResources: res.data.crisisResources,
        });
      } else {
        setCurrentQuestion(res.data.nextQuestion);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to save response.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="text-indigo-600" size={20} />
          <div>
            <h2 className="text-sm font-bold text-indigo-950">
              PHQ-9 Depression Screening Questionnaire
            </h2>
            <p className="text-xs text-indigo-700">
              Over the last 2 weeks, how often have you been bothered by the following?
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLanguage((prev) => (prev === "en" ? "si" : "en"))}
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            <Globe size={13} />
            {language === "en" ? "සිංහල" : "English"}
          </button>
          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            <History size={13} />
            History ({history.filter((h) => h.status === "completed").length})
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-white"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {crisisResources && <CrisisResourcesBanner resources={crisisResources} />}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-indigo-700">Loading PHQ-9 screening...</p>
      ) : completedResult ? (
        <div className="rounded-xl bg-white border border-indigo-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Screening Result
              </p>
              <p className="text-2xl font-extrabold text-indigo-900 mt-0.5">
                {completedResult.totalScore} / 27 — {completedResult.severityBand}
              </p>
            </div>
            <button
              type="button"
              onClick={() => startOrResume(true)}
              className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Start New Screening
            </button>
          </div>
          <p className="text-xs text-gray-600">{completedResult.disclaimer}</p>
        </div>
      ) : currentQuestion ? (
        <div className="rounded-xl bg-white border border-indigo-100 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-semibold text-indigo-700">
              Question {currentQuestion.number} of 9
            </span>
            <div className="w-32 h-1.5 bg-indigo-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all"
                style={{ width: `${(currentQuestion.number / 9) * 100}%` }}
              />
            </div>
          </div>

          <p className="text-sm font-semibold text-gray-900">
            {language === "si" ? currentQuestion.si : currentQuestion.text}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={submitting}
                onClick={() => handleAnswer(opt.value)}
                className="text-left rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-medium text-gray-800 hover:border-indigo-400 hover:bg-indigo-50 transition-colors disabled:opacity-50"
              >
                <span className="font-bold text-indigo-700 mr-1.5">{opt.value}.</span>
                {language === "si" ? opt.si : opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {showHistory && (
        <div className="rounded-xl bg-white border border-indigo-100 p-3 space-y-2">
          <p className="text-xs font-bold text-gray-700">Past Screening Records</p>
          {history.filter((h) => h.status === "completed").length === 0 ? (
            <p className="text-xs text-gray-500">No completed PHQ-9 screenings yet.</p>
          ) : (
            <div className="divide-y divide-gray-100 text-xs">
              {history
                .filter((h) => h.status === "completed")
                .map((item) => (
                  <div key={item.id} className="py-2 flex items-center justify-between">
                    <span>
                      {new Date(item.completedAt || item.createdAt).toLocaleDateString()} — Score:{" "}
                      <strong>{item.totalScore}/27</strong> ({item.severityBand})
                    </span>
                    {item.q9SafetyTriggered ? (
                      <span className="rounded-full bg-red-100 text-red-800 px-2 py-0.5 font-semibold">
                        Safety Flagged
                      </span>
                    ) : null}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
