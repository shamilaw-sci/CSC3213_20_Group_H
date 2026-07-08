import { useEffect, useState } from "react";
import axios from "axios";

interface Session {
  id: number;
  appointment_date: string;
  status: string;
  start_time: string;
  end_time: string;
}

const SessionHistory = () => {
  const [sessions, setSessions] = useState<Session[]>([]);

  const fetchSessions = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/sessions/2"
      );

      setSessions(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

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
              border: "1px solid gray",
              padding: "10px",
              marginBottom: "10px",
            }}
          >
            <p>
              <strong>Date:</strong>{" "}
              {session.appointment_date}
            </p>

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
          </div>
        ))
      )}
    </div>
  );
};

export default SessionHistory;