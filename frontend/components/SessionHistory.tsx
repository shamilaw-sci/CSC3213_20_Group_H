"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";
import { Session } from "@/types/Session";

const SessionHistory = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      const response = await api.get("/sessions/2");

      setSessions(response.data);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  if (loading) {
    return <p>Loading sessions...</p>;
  }

  return (
    <div>
      <h2>Session History</h2>

      {sessions.length === 0 ? (
        <p>No Sessions Found</p>
      ) : (
        sessions.map((session) => (
          <div
            key={session.id}
            style={{
              border: "1px solid #ccc",
              padding: "12px",
              marginBottom: "10px",
              borderRadius: "8px",
            }}
          >
            <p>
              <strong>Session ID:</strong> {session.id}
            </p>

            {session.appointment_date && (
              <p>
                <strong>Date:</strong>{" "}
                {session.appointment_date}
              </p>
            )}

            <p>
              <strong>Status:</strong>{" "}
              {session.status}
            </p>

            <p>
              <strong>Start Time:</strong>{" "}
              {session.start_time}
            </p>

            <p>
              <strong>End Time:</strong>{" "}
              {session.end_time}
            </p>

            {session.notes && (
              <p>
                <strong>Notes:</strong>{" "}
                {session.notes}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default SessionHistory;