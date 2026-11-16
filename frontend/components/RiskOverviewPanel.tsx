"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Search,
  UserPlus,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import api from "@/services/api";
import socket from "@/services/socket";

type OverviewStats = {
  riskCounts: { low: number; moderate: number; high: number };
  totalPatients: number;
  unreviewedRiskAssessments: number;
  activeUrgentAlerts: number;
  unacknowledgedAlerts: number;
  pendingFollowUps: number;
};

type ClinicalPatient = {
  patientId: number;
  name: string | null;
  email: string | null;
  role: string;
  anonymousId: string | null;
  isAnonymous: boolean;
  registrationDate: string;
  latestScreeningDate: string | null;
  latestPhq9Score: number | null;
  latestPhq9Severity: string | null;
  currentRiskLevel: "low" | "moderate" | "high";
  unreviewedAssessments: number;
  assignedCounsellorId: number | null;
  assignedCounsellorName: string | null;
  followUpStatus: string;
  activeAlertsCount: number;
};

type CounsellorOption = {
  id: number;
  userId: number | null;
  name: string;
  specialization: string;
  verificationStatus: string;
  isAvailable: boolean;
  activePatientsCount: number;
};

type AlertItem = {
  id: number;
  student_id: number;
  patient_name: string | null;
  anonymousId: string | null;
  severity_score: string;
  risk_level: string;
  description: string;
  status: string;
  escalation_level: number;
  created_at: string;
  acknowledged_at: string | null;
  acknowledged_by_name: string | null;
  outcome_notes: string | null;
};

type NotificationItem = {
  id: number;
  category: string;
  title: string;
  message: string;
  patient_id: number | null;
  is_read: boolean;
  escalation_status: string;
  created_at: string;
};

function riskBadgeClass(level: string) {
  if (level === "high")
    return "bg-rose-100 text-rose-800 border-rose-200";
  if (level === "moderate")
    return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-emerald-100 text-emerald-800 border-emerald-200";
}

export default function RiskOverviewPanel({
  isAdmin = false,
}: {
  isAdmin?: boolean;
}) {
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [patients, setPatients] = useState<ClinicalPatient[]>([]);
  const [counsellors, setCounsellors] = useState<CounsellorOption[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [riskFilter, setRiskFilter] = useState("");
  const [counsellorFilter, setCounsellorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  // Alert resolution modal state
  const [resolvingAlertId, setResolvingAlertId] = useState<number | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState("");

  const fetchData = useCallback(async () => {
    setError("");
    try {
      const params = {
        riskLevel: riskFilter || undefined,
        counsellorId: counsellorFilter || undefined,
        status: statusFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        search: search || undefined,
      };

      const [ovRes, patRes, counRes, alertRes, notifRes] = await Promise.all([
        api.get("/clinical/overview", { params }),
        api.get("/clinical/patients", { params }),
        api.get("/clinical/counsellors"),
        api.get("/clinical/alerts"),
        api.get("/notifications"),
      ]);

      setOverview(ovRes.data);
      setPatients(patRes.data.patients || []);
      setCounsellors(counRes.data.counsellors || []);
      setAlerts(alertRes.data.alerts || []);
      setNotifications(notifRes.data.notifications || []);
    } catch (err: any) {
      setError(
        err?.response?.data?.error || "Could not load clinical oversight data."
      );
    } finally {
      setLoading(false);
    }
  }, [riskFilter, counsellorFilter, statusFilter, dateFrom, dateTo, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      socket.emit("joinUserRoom", token);
    }

    const onRefresh = () => {
      fetchData();
    };
    socket.on("emergencyAlert", onRefresh);
    socket.on("emergencyUpdated", onRefresh);
    socket.on("emergencyEscalated", onRefresh);
    socket.on("notification", onRefresh);

    return () => {
      socket.off("emergencyAlert", onRefresh);
      socket.off("emergencyUpdated", onRefresh);
      socket.off("emergencyEscalated", onRefresh);
      socket.off("notification", onRefresh);
    };
  }, [fetchData]);

  const handleAssignCounsellor = async (
    patientId: number,
    counsellorId: number
  ) => {
    if (!counsellorId) return;
    try {
      await api.post("/clinical/assignments", { patientId, counsellorId });
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to assign counsellor.");
    }
  };

  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      await api.put(`/clinical/alerts/${alertId}/acknowledge`, {});
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to acknowledge alert.");
    }
  };

  const handleResolveAlert = async (alertId: number) => {
    if (!outcomeNotes.trim()) {
      alert("Please enter outcome notes before resolving the alert.");
      return;
    }
    try {
      await api.put(`/clinical/alerts/${alertId}/resolve`, { outcomeNotes });
      setResolvingAlertId(null);
      setOutcomeNotes("");
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to resolve alert.");
    }
  };

  const handleEscalateOverdue = async () => {
    try {
      const res = await api.post("/clinical/alerts/escalate-overdue", {});
      alert(
        res.data.escalatedCount > 0
          ? `Escalated ${res.data.escalatedCount} overdue alert(s).`
          : "No unacknowledged alerts past the escalation threshold."
      );
      await fetchData();
    } catch {
      alert("Could not check overdue escalations.");
    }
  };

  const handleMarkNotificationRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`);
      await fetchData();
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Operational Risk Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="p-4 bg-white border border-emerald-200 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold text-emerald-700 uppercase">
            Low Risk
          </p>
          <p className="text-3xl font-extrabold text-gray-900 mt-1">
            {overview?.riskCounts.low ?? 0}
          </p>
        </div>
        <div className="p-4 bg-white border border-amber-200 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold text-amber-700 uppercase">
            Moderate Risk
          </p>
          <p className="text-3xl font-extrabold text-amber-700 mt-1">
            {overview?.riskCounts.moderate ?? 0}
          </p>
        </div>
        <div className="p-4 bg-white border border-rose-200 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold text-rose-700 uppercase">
            High Risk
          </p>
          <p className="text-3xl font-extrabold text-rose-600 mt-1">
            {overview?.riskCounts.high ?? 0}
          </p>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase">
            Unreviewed
          </p>
          <p className="text-3xl font-extrabold text-indigo-700 mt-1">
            {overview?.unreviewedRiskAssessments ?? 0}
          </p>
        </div>
        <div className="p-4 bg-white border border-rose-200 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold text-rose-600 uppercase">
            Urgent Alerts
          </p>
          <p className="text-3xl font-extrabold text-rose-600 mt-1">
            {overview?.activeUrgentAlerts ?? 0}
          </p>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase">
            Pending Follow-Ups
          </p>
          <p className="text-3xl font-extrabold text-blue-700 mt-1">
            {overview?.pendingFollowUps ?? 0}
          </p>
        </div>
      </div>

      {/* Urgent Alerts & Notifications Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ShieldAlert size={20} className="text-rose-600" />
              Safety Alerts & Escalation Queue
            </h2>
            <button
              type="button"
              onClick={handleEscalateOverdue}
              className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Check Overdue Escalations
            </button>
          </div>

          {alerts.length === 0 ? (
            <p className="text-sm text-gray-500">No emergency or high-risk alerts logged.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {alerts.map((alertItem) => (
                <div
                  key={alertItem.id}
                  className={`rounded-xl border p-3.5 space-y-2 ${
                    alertItem.status === "Pending_Acknowledgment"
                      ? "border-rose-300 bg-rose-50"
                      : alertItem.status === "Acknowledged"
                        ? "border-amber-200 bg-amber-50/50"
                        : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-bold">
                    <span className="text-gray-900">
                      Alert #{alertItem.id} •{" "}
                      {alertItem.patient_name ||
                        alertItem.anonymousId ||
                        `Patient #${alertItem.student_id}`}
                    </span>
                    <span className="rounded-full px-2 py-0.5 bg-white border text-gray-800">
                      {alertItem.status}
                      {alertItem.escalation_level > 0
                        ? ` (Escalated L${alertItem.escalation_level})`
                        : ""}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700">{alertItem.description}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
                    <span>
                      {new Date(alertItem.created_at).toLocaleString()}
                      {alertItem.acknowledged_by_name
                        ? ` • Ack by ${alertItem.acknowledged_by_name}`
                        : ""}
                    </span>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/clinical/patients/${alertItem.student_id}`}
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        Open Record
                      </Link>
                      {alertItem.status === "Pending_Acknowledgment" && (
                        <button
                          type="button"
                          onClick={() => handleAcknowledgeAlert(alertItem.id)}
                          className="rounded-lg bg-amber-600 px-2.5 py-1 font-semibold text-white hover:bg-amber-700"
                        >
                          Acknowledge
                        </button>
                      )}
                      {alertItem.status !== "Resolved" && (
                        <button
                          type="button"
                          onClick={() => setResolvingAlertId(alertItem.id)}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 font-semibold text-white hover:bg-emerald-700"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                  {resolvingAlertId === alertItem.id && (
                    <div className="pt-2 border-t border-gray-200 flex gap-2">
                      <input
                        type="text"
                        value={outcomeNotes}
                        onChange={(e) => setOutcomeNotes(e.target.value)}
                        placeholder="Record human intervention & outcome..."
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleResolveAlert(alertItem.id)}
                        className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Panel */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Bell size={20} className="text-indigo-600" />
            Clinical Notifications ({notifications.filter((n) => !n.is_read).length} unread)
          </h2>

          {notifications.length === 0 ? (
            <p className="text-sm text-gray-500">No notifications yet.</p>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-xl border p-3 text-xs flex items-start justify-between gap-3 ${
                    n.is_read
                      ? "border-gray-100 bg-gray-50 text-gray-600"
                      : "border-indigo-200 bg-indigo-50/70 text-gray-900"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{n.title}</span>
                      <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase border">
                        {n.category}
                      </span>
                    </div>
                    <p>{n.message}</p>
                    <p className="text-[11px] text-gray-500">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {!n.is_read && (
                      <button
                        type="button"
                        onClick={() => handleMarkNotificationRead(n.id)}
                        className="text-indigo-700 font-semibold hover:underline"
                      >
                        Mark read
                      </button>
                    )}
                    {n.patient_id && (
                      <Link
                        href={`/clinical/patients/${n.patient_id}`}
                        className="text-blue-700 font-semibold hover:underline"
                      >
                        View Patient
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Patient Screening & Risk Directory with Filters */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardCheck size={20} className="text-blue-600" />
              Patient Screening & Operational Risk Monitoring
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Operational priority categories guide counsellor follow-up and do not constitute clinical diagnoses.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, ID..."
              className="w-full rounded-xl border border-gray-200 pl-8 pr-3 py-2 text-xs"
            />
          </div>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            aria-label="Filter by risk level"
            className="rounded-xl border border-gray-200 px-3 py-2 text-xs"
          >
            <option value="">All Risk Levels</option>
            <option value="high">High Risk</option>
            <option value="moderate">Moderate Risk</option>
            <option value="low">Low Risk</option>
          </select>

          <select
            value={counsellorFilter}
            onChange={(e) => setCounsellorFilter(e.target.value)}
            aria-label="Filter by counsellor"
            className="rounded-xl border border-gray-200 px-3 py-2 text-xs"
          >
            <option value="">All Counsellors</option>
            {counsellors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by follow-up status"
            className="rounded-xl border border-gray-200 px-3 py-2 text-xs"
          >
            <option value="">All Follow-Up Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="none">No Follow-Up</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="Filter from date"
            className="rounded-xl border border-gray-200 px-3 py-2 text-xs"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="Filter to date"
            className="rounded-xl border border-gray-200 px-3 py-2 text-xs"
          />
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading patient records...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="pb-3 px-3">Patient</th>
                  <th className="pb-3 px-3">Registered</th>
                  <th className="pb-3 px-3">Latest PHQ-9</th>
                  <th className="pb-3 px-3">Operational Risk</th>
                  <th className="pb-3 px-3">Assigned Counsellor</th>
                  <th className="pb-3 px-3">Follow-Up</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {patients.map((p) => (
                  <tr key={p.patientId} className="hover:bg-gray-50/70">
                    <td className="py-3.5 px-3">
                      <p className="font-bold text-gray-900">
                        {p.name || p.anonymousId || `Patient #${p.patientId}`}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        ID #{p.patientId} {p.email ? `• ${p.email}` : "• Anonymous"}
                      </p>
                    </td>
                    <td className="py-3.5 px-3 text-gray-600">
                      {new Date(p.registrationDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-3">
                      {p.latestPhq9Score !== null ? (
                        <div>
                          <span className="font-bold text-gray-900">
                            {p.latestPhq9Score}/27
                          </span>{" "}
                          <span className="text-gray-600">({p.latestPhq9Severity})</span>
                          {p.latestScreeningDate && (
                            <p className="text-[11px] text-gray-400">
                              {new Date(p.latestScreeningDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Not screened</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-bold uppercase ${riskBadgeClass(
                          p.currentRiskLevel
                        )}`}
                      >
                        {p.currentRiskLevel === "high" && <AlertTriangle size={11} />}
                        {p.currentRiskLevel}
                      </span>
                      {p.unreviewedAssessments > 0 && (
                        <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                          {p.unreviewedAssessments} unreviewed
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      {isAdmin ? (
                        <select
                          value={p.assignedCounsellorId || ""}
                          onChange={(e) =>
                            handleAssignCounsellor(p.patientId, Number(e.target.value))
                          }
                          aria-label={`Assign counsellor for patient ${p.patientId}`}
                          className="rounded-lg border border-gray-200 px-2 py-1 text-xs bg-white"
                        >
                          <option value="">Unassigned</option>
                          {counsellors.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.activePatientsCount})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-700 font-medium">
                          {p.assignedCounsellorName || "Unassigned"}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="capitalize font-semibold text-gray-700">
                        {p.followUpStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <Link
                        href={`/clinical/patients/${p.patientId}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700"
                      >
                        Details <ExternalLink size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {patients.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      No matching patient records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Available Counsellors Summary */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <UserPlus size={18} className="text-indigo-600" />
          Available Counsellors & Caseload
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {counsellors.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-gray-200 p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-bold text-sm text-gray-900">{c.name}</p>
                <p className="text-xs text-gray-500">{c.specialization}</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  Active patients: <strong>{c.activePatientsCount}</strong>
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  c.isAvailable
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <CheckCircle2 size={12} />
                {c.isAvailable ? "Available" : "Unavailable"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
