"use client";

import Link from "next/link";

interface UpcomingAppointmentProps {
  appointment: {
    professionalName?: string;
    professionalType?: string;
    date?: string;
    time?: string;
    mode?: string;
  } | null;
}

export default function UpcomingAppointment({
  appointment,
}: UpcomingAppointmentProps) {
  return (
    <section className="bg-white rounded-2xl border border-cyan-100 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800">
          Upcoming Appointment
        </h3>

        <div className="w-11 h-11 rounded-xl bg-cyan-50 flex items-center justify-center text-2xl">
          📅
        </div>
      </div>

      {appointment ? (
        <>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 shrink-0 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-2xl">
              👩‍⚕️
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-800">
                {appointment.professionalName ||
                  "Mental Health Professional"}
              </h4>

              <p className="text-sm text-gray-500">
                {appointment.professionalType ||
                  "Mental Health Professional"}
              </p>

              <div className="mt-4 space-y-2">
                {appointment.date && (
                  <p className="text-sm text-gray-600">
                    📅 {appointment.date}
                  </p>
                )}

                {appointment.time && (
                  <p className="text-sm text-gray-600">
                    🕙 {appointment.time}
                  </p>
                )}

                {appointment.mode && (
                  <p className="text-sm text-gray-600">
                    💻 {appointment.mode}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              href="/voice-call"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-700 hover:to-cyan-600 transition-all font-semibold shadow-sm"
            >
              Join Session
            </Link>

            <Link
              href="/student/appointments"
              className="px-4 py-2.5 rounded-xl border border-cyan-300 text-cyan-700 hover:bg-cyan-50 transition-colors font-medium"
            >
              View Details →
            </Link>
          </div>
        </>
      ) : (
        <div className="text-center py-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-50 flex items-center justify-center text-3xl mb-4">
            📅
          </div>

          <h4 className="text-lg font-semibold text-gray-800">
            No upcoming appointments
          </h4>

          <p className="text-sm text-gray-500 mt-2">
            You don't have a scheduled counselling session yet.
          </p>

          <Link
            href="/student/appointments"
            className="
              inline-block
              mt-5
              px-5
              py-2.5
              rounded-xl
              bg-gradient-to-r
              from-blue-600
              to-cyan-500
              text-white
              hover:from-blue-700
              hover:to-cyan-600
              transition-all
              font-semibold
            "
          >
            Book Appointment →
          </Link>
        </div>
      )}
    </section>
  );
}