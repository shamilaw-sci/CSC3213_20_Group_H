"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  ArrowLeft,
  CheckCircle,
  Download,
  FileText,
  Sparkles,
  Upload,
} from "lucide-react";
import api, { API_BASE_URL } from "@/services/api";

export default function ClinicalPatientDetail({
  patientId,
}: {
  patientId: string;
}) {
  const [data, setData] = useState<any>(null);
  const [counsellors, setCounsellors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Note & Follow-up state
  const [noteText, setNoteText] = useState("");
  const [followUpStatus, setFollowUpStatus] = useState("pending");
  const [actionTaken, setActionTaken] = useState("");
  const [outcome, setOutcome] = useState("");
  const [reviewDate, setReviewDate] = useState("");

  // Document upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [autoSummarize, setAutoSummarize] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [summarizingDocId, setSummarizingDocId] = useState<number | null>(null);

  const loadDetail = useCallback(async () => {
    setError("");
    try {
      const [detailRes, counRes] = await Promise.all([
        api.get(`/clinical/patients/${patientId}`),
        api.get("/clinical/counsellors"),
      ]);
      setData(detailRes.data);
      setCounsellors(counRes.data.counsellors || []);
    } catch (err: any) {
      setError(
        err?.response?.data?.error || "Could not load patient clinical record."
      );
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleReviewRisk = async (
    assessmentId: number,
    validatedRiskLevel: string
  ) => {
    const notes = window.prompt(
      "Enter clinical review/override notes (logged to audit trail):",
      "Reviewed by clinician"
    );
    if (notes === null) return;
    try {
      await api.put(`/clinical/risk-assessments/${assessmentId}/review`, {
        validatedRiskLevel,
        reviewNotes: notes,
      });
      await loadDetail();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to update risk assessment.");
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      await api.post(`/clinical/patients/${patientId}/notes`, {
        noteText,
        followUpStatus,
        actionTaken: actionTaken || undefined,
        outcome: outcome || undefined,
        reviewDate: reviewDate || undefined,
      });
      setNoteText("");
      setActionTaken("");
      setOutcome("");
      setReviewDate("");
      await loadDetail();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to save note.");
    }
  };

  const handleCreateFollowUp = async () => {
    const notes = window.prompt("Follow-up instructions / focus:");
    if (!notes) return;
    try {
      await api.post(`/clinical/patients/${patientId}/follow-ups`, {
        priority: "moderate",
        notes,
      });
      await loadDetail();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to create follow-up.");
    }
  };

  const handleCompleteFollowUp = async (followUpId: number) => {
    const outcomeInput = window.prompt("Enter follow-up outcome:");
    if (!outcomeInput) return;
    try {
      await api.put(`/clinical/follow-ups/${followUpId}`, {
        status: "completed",
        outcome: outcomeInput,
      });
      await loadDetail();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to update follow-up.");
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    if (autoSummarize && !consentConfirmed) {
      alert(
        "Please confirm patient/administrative data-processing consent before generating an AI summary."
      );
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("document", selectedFile);
      formData.append("consentConfirmed", String(consentConfirmed));
      formData.append("autoSummarize", String(autoSummarize));

      const res = await api.post(
        `/clinical/patients/${patientId}/documents`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (res.data.summaryError) {
        alert(
          `Document uploaded, but AI summary could not be generated: ${res.data.summaryError}`
        );
      }

      setSelectedFile(null);
      await loadDetail();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Document upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadDocument = async (docId: number, filename: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE_URL}/api/clinical/documents/${docId}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      alert("Could not download document.");
    }
  };

  const handleGenerateSummary = async (docId: number) => {
    if (
      !window.confirm(
        "Confirm patient/administrative consent to send extracted document text to Gemini for AI-assisted summarization?"
      )
    ) {
      return;
    }
    setSummarizingDocId(docId);
    try {
      await api.post(`/clinical/documents/${docId}/summarize`, {
        consentConfirmed: true,
      });
      await loadDetail();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Could not generate AI summary.");
    } finally {
      setSummarizingDocId(null);
    }
  };

  const handleMarkSummaryReviewed = async (summaryId: number) => {
    const reviewerNotes = window.prompt(
      "Optional clinician review notes:",
      "Verified against source document"
    );
    if (reviewerNotes === null) return;
    try {
      await api.put(`/clinical/document-summaries/${summaryId}/review`, {
        reviewerNotes,
      });
      await loadDetail();
    } catch {
      alert("Failed to mark summary as reviewed.");
    }
  };

  const handleAssign = async (counsellorId: number) => {
    if (!counsellorId) return;
    try {
      await api.post("/clinical/assignments", {
        patientId: Number(patientId),
        counsellorId,
      });
      await loadDetail();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Could not assign counsellor.");
    }
  };

  if (loading) {
    return <div className="p-10 text-sm text-gray-500">Loading patient clinical record...</div>;
  }

  if (error || !data) {
    return (
      <div className="p-10 text-sm text-rose-700">
        {error || "Patient record unavailable."}
      </div>
    );
  }

  const phq9ChartData = (data.phq9Screenings || [])
    .filter((s: any) => s.status === "completed")
    .map((s: any) => ({
      date: new Date(s.completedAt || s.createdAt).toLocaleDateString(),
      score: s.totalScore,
      severity: s.severityBand,
    }));

  const currentUserRole =
    typeof window !== "undefined"
      ? String(localStorage.getItem("role") || "").toLowerCase()
      : "";
  const isAdmin = ["admin", "supervisor"].includes(currentUserRole);

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href={isAdmin ? "/admin/dashboard" : "/counsellor/dashboard"}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
            {data.patient.name ||
              data.patient.anonymousId ||
              `Patient #${data.patient.id}`}
          </h1>
          <p className="text-xs text-gray-500">
            Patient ID: #{data.patient.id} • Role: {data.patient.role} •
            Registered:{" "}
            {new Date(data.patient.registrationDate).toLocaleDateString()}
            {data.activeAssignment
              ? ` • Assigned Counsellor: ${data.activeAssignment.counsellor_name}`
              : " • Unassigned"}
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <span className="text-xs font-semibold text-gray-600">
              Assign Counsellor:
            </span>
            <select
              value={data.activeAssignment?.counsellor_id || ""}
              onChange={(e) => handleAssign(Number(e.target.value))}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1"
            >
              <option value="">Select counsellor</option>
              {counsellors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.specialization})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Progress Monitoring Chart (PHQ-9 over time) */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-3">
        <h2 className="text-lg font-bold text-gray-900">
          PHQ-9 Screening Progress Over Time
        </h2>
        <p className="text-xs text-gray-500">
          Note: PHQ-9 scores are structured screening indicators only. A change in
          score must not be treated as standalone proof of recovery or
          deterioration without clinical interpretation.
        </p>

        {phq9ChartData.length === 0 ? (
          <p className="text-sm text-gray-400 py-6">
            No completed PHQ-9 screenings recorded for this patient yet.
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={phq9ChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 27]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Risk Assessments & Conversation History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">
            Operational Risk Assessment History
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {(data.riskAssessments || []).map((ra: any) => (
              <div
                key={ra.id}
                className="rounded-xl border border-gray-200 p-3.5 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase">
                    Validated: {ra.validated_risk_level}{" "}
                    {ra.ai_suggested_level
                      ? `(AI suggested: ${ra.ai_suggested_level})`
                      : ""}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold">
                    {ra.review_status}
                  </span>
                </div>
                <ul className="list-disc pl-4 text-gray-700 space-y-0.5">
                  {(ra.reasons || []).map((reason: string, idx: number) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500 pt-1">
                  <span>
                    {new Date(ra.created_at).toLocaleString()} • {ra.modality}
                    {ra.uncertainty_flag ? " • Uncertainty flagged" : ""}
                    {ra.deterministic_override ? " • Safety override" : ""}
                  </span>
                  <div className="flex gap-1">
                    {["low", "moderate", "high"].map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => handleReviewRisk(ra.id, lvl)}
                        className="rounded border border-gray-200 px-2 py-0.5 font-semibold hover:bg-gray-100 capitalize"
                      >
                        Set {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {(data.riskAssessments || []).length === 0 && (
              <p className="text-sm text-gray-400">No risk assessments recorded yet.</p>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">
            Conversation History (Text & Voice)
          </h2>
          <div className="space-y-2.5 max-h-96 overflow-y-auto">
            {(data.messages || []).map((msg: any) => (
              <div
                key={msg.id}
                className={`rounded-xl p-3 text-xs ${
                  msg.sender === "patient"
                    ? "bg-blue-50 border border-blue-100"
                    : msg.crisisFlag
                      ? "bg-rose-50 border border-rose-200"
                      : "bg-gray-50 border border-gray-100"
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 mb-1">
                  <span className="uppercase">
                    {msg.sender} ({msg.modality})
                  </span>
                  <span>{new Date(msg.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-gray-900 whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
            {(data.messages || []).length === 0 && (
              <p className="text-sm text-gray-400">No conversation messages recorded.</p>
            )}
          </div>
        </div>
      </div>

      {/* Medical History Document Upload & AI Summaries */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-6">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <FileText size={20} className="text-indigo-600" />
          Patient History Documents & AI-Assisted Summaries
        </h2>

        <form
          onSubmit={handleUploadDocument}
          className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              type="file"
              accept=".pdf,.txt,.md,.csv,.json"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="text-xs"
            />
            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Upload size={14} />
              {uploading ? "Uploading..." : "Upload Document"}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 text-xs text-gray-700">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={consentConfirmed}
                onChange={(e) => setConsentConfirmed(e.target.checked)}
              />
              Confirm patient/administrative consent for Gemini document analysis
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoSummarize}
                onChange={(e) => setAutoSummarize(e.target.checked)}
              />
              Generate AI summary immediately (subject to human review)
            </label>
          </div>
        </form>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(data.documents || []).map((doc: any) => {
            const docSummaries = (data.documentSummaries || []).filter(
              (s: any) => s.document_id === doc.id
            );
            return (
              <div
                key={doc.id}
                className="rounded-xl border border-gray-200 p-4 space-y-3 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-gray-900">{doc.originalFilename}</p>
                    <p className="text-[11px] text-gray-500">
                      {(doc.fileSize / 1024).toFixed(1)} KB •{" "}
                      {new Date(doc.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadDocument(doc.id, doc.originalFilename)
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 font-semibold hover:bg-gray-50"
                    >
                      <Download size={12} /> Original
                    </button>
                    <button
                      type="button"
                      disabled={summarizingDocId === doc.id}
                      onClick={() => handleGenerateSummary(doc.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                    >
                      <Sparkles size={12} />
                      {summarizingDocId === doc.id ? "Summarizing..." : "AI Summary"}
                    </button>
                  </div>
                </div>

                {docSummaries.map((sum: any) => {
                  const facts = sum.summary_json?.documentedFacts || {};
                  const interp = sum.summary_json?.aiInterpretations || {};
                  return (
                    <div
                      key={sum.id}
                      className="rounded-lg bg-indigo-50/50 border border-indigo-100 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-900">
                          AI-Assisted Summary (Human Review{" "}
                          {sum.review_status === "reviewed" ? "Completed" : "Required"})
                        </span>
                        {sum.review_status !== "reviewed" ? (
                          <button
                            type="button"
                            onClick={() => handleMarkSummaryReviewed(sum.id)}
                            className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white"
                          >
                            <CheckCircle size={11} /> Mark Reviewed
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-700 font-semibold">
                            Reviewed by {sum.reviewed_by_name}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-gray-800">
                        <p>
                          <strong>Documented History:</strong>{" "}
                          {facts.previousMentalHealthHistory || "Not documented"}
                        </p>
                        <p>
                          <strong>Documented Symptoms:</strong>{" "}
                          {(facts.documentedSymptoms || []).join(", ") || "None documented"}
                        </p>
                        <p>
                          <strong>Previous Screening Results:</strong>{" "}
                          {facts.previousScreeningResults || "Not documented"}
                        </p>
                        <p>
                          <strong>Treatments / Medications:</strong>{" "}
                          {(facts.treatmentsOrMedications || []).join(", ") ||
                            "None documented"}
                        </p>
                        <p>
                          <strong>Previous Recommendations:</strong>{" "}
                          {(facts.previousRecommendations || []).join(", ") ||
                            "None documented"}
                        </p>
                        <p>
                          <strong>Historical Changes:</strong>{" "}
                          {facts.historicalChanges || "Not documented"}
                        </p>
                        <hr className="border-indigo-100 my-1" />
                        <p className="text-indigo-950">
                          <strong>AI Attention Notes (Unconfirmed):</strong>{" "}
                          {interp.overallContextNote}{" "}
                          {(interp.itemsRequiringCounsellorAttention || []).join("; ")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {(data.documents || []).length === 0 && (
            <p className="text-sm text-gray-400">No medical history documents uploaded yet.</p>
          )}
        </div>
      </div>

      {/* Counsellor Notes & Follow-Ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Counsellor Notes</h2>
          <form onSubmit={handleAddNote} className="space-y-2.5">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write clinical / support note..."
              rows={3}
              required
              className="w-full rounded-xl border border-gray-200 p-3 text-xs"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={followUpStatus}
                onChange={(e) => setFollowUpStatus(e.target.value)}
                className="rounded-xl border border-gray-200 px-2.5 py-2 text-xs"
              >
                <option value="none">Follow-up: None</option>
                <option value="pending">Follow-up: Pending</option>
                <option value="in_progress">Follow-up: In Progress</option>
                <option value="completed">Follow-up: Completed</option>
              </select>
              <input
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
                className="rounded-xl border border-gray-200 px-2.5 py-2 text-xs"
              />
              <input
                type="text"
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                placeholder="Action taken..."
                className="rounded-xl border border-gray-200 px-2.5 py-2 text-xs"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="Outcome (if applicable)..."
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs"
              />
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Save Note
              </button>
            </div>
          </form>

          <div className="space-y-2 max-h-72 overflow-y-auto pt-2">
            {(data.counsellorNotes || []).map((n: any) => (
              <div
                key={n.id}
                className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs space-y-1"
              >
                <div className="flex justify-between text-[11px] text-gray-500 font-semibold">
                  <span>{n.counsellor_name || "Counsellor"}</span>
                  <span>{new Date(n.created_at).toLocaleString()}</span>
                </div>
                <p className="text-gray-900">{n.note_text}</p>
                {(n.action_taken || n.outcome) && (
                  <p className="text-[11px] text-gray-600">
                    {n.action_taken ? `Action: ${n.action_taken} ` : ""}
                    {n.outcome ? `• Outcome: ${n.outcome}` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Follow-Up Records</h2>
            <button
              type="button"
              onClick={handleCreateFollowUp}
              className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
            >
              + Schedule Follow-Up
            </button>
          </div>
          <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {(data.followUps || []).map((fu: any) => (
              <div
                key={fu.id}
                className="rounded-xl border border-gray-200 p-3 text-xs flex items-start justify-between gap-2"
              >
                <div className="space-y-1">
                  <p className="font-bold capitalize text-gray-900">
                    {fu.priority} priority • Status: {fu.status.replace("_", " ")}
                  </p>
                  <p className="text-gray-700">{fu.notes || "Follow-up review"}</p>
                  {fu.outcome && (
                    <p className="text-emerald-700 font-medium">
                      Outcome: {fu.outcome}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-400">
                    Created {new Date(fu.created_at).toLocaleDateString()}
                    {fu.due_date
                      ? ` • Due ${new Date(fu.due_date).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
                {fu.status !== "completed" && (
                  <button
                    type="button"
                    onClick={() => handleCompleteFollowUp(fu.id)}
                    className="rounded-lg bg-emerald-600 px-2.5 py-1 font-semibold text-white hover:bg-emerald-700 shrink-0"
                  >
                    Complete
                  </button>
                )}
              </div>
            ))}
            {(data.followUps || []).length === 0 && (
              <p className="text-sm text-gray-400">No follow-ups recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
