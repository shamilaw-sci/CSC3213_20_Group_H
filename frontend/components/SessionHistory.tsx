"use client";

import { useEffect, useState } from "react";

export default function SessionHistory() {
  const [sessions, setSessions] =
    useState<any[]>([]);

  useEffect(() => {
    const user = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    if (!user.id) return;

    fetch(
      `http://localhost:5050/api/sessions/${user.id}`
    )
      .then((res) => res.json())
      .then((data) =>
        setSessions(data)
      )
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-4">
      {sessions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No booked sessions found.
        </div>
      ) : (
        sessions.map((session) => (
          <div
            key={session.id}
            className="border border-gray-200 rounded-2xl p-5 bg-gray-50"
          >
            <h3 className="font-bold text-lg">
              {session.name}
            </h3>

            <p className="text-gray-600">
              {session.specialization}
            </p>

            <div className="mt-3">
              <p>
                <strong>Date:</strong>{" "}
                {new Date(
                  session.available_date
                ).toLocaleDateString()}
              </p>

              <p>
                <strong>Time:</strong>{" "}
                {session.start_time}
                {" - "}
                {session.end_time}
              </p>

              <p>
                <strong>Booked:</strong>{" "}
                {new Date(
                  session.booked_at
                ).toLocaleString()}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}