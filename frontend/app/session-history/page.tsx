import AuthGuard from "@/components/AuthGuard";
import SessionHistory from "@/components/SessionHistory";

import { Nunito } from "next/font/google";
import {
  History,
  Calendar,
  FileText,
  ShieldCheck,
} from "lucide-react";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export default function SessionHistoryPage() {
  return (
    <AuthGuard>
      <section
        className={`${nunito.className} min-h-screen bg-gray-50 py-16 px-6`}
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-purple-100 mb-5">
              <History size={40} className="text-purple-600" />
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900">
              Session History
            </h1>

            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              Review your previous counselling appointments,
              completed sessions, and support journey with
              CareBridge.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <Calendar
                size={30}
                className="text-purple-600 mb-3"
              />

              <h3 className="font-bold text-lg text-gray-900">
                Appointment Timeline
              </h3>

              <p className="text-gray-600 text-sm mt-2">
                Track previous appointments and counselling
                sessions in chronological order.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <FileText
                size={30}
                className="text-blue-600 mb-3"
              />

              <h3 className="font-bold text-lg text-gray-900">
                Session Records
              </h3>

              <p className="text-gray-600 text-sm mt-2">
                Access completed counselling records and
                appointment information securely.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <ShieldCheck
                size={30}
                className="text-emerald-600 mb-3"
              />

              <h3 className="font-bold text-lg text-gray-900">
                Private & Secure
              </h3>

              <p className="text-gray-600 text-sm mt-2">
                Your session history is protected and only
                accessible to authorized users.
              </p>
            </div>
          </div>

          {/* Session History Module */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="mb-8">
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                CareBridge Records
              </span>

              <h2 className="text-2xl font-bold text-gray-900 mt-4">
                Previous Counselling Sessions
              </h2>

              <p className="text-gray-600 mt-2">
                View complete details of your past sessions,
                appointment dates, and counselling history.
              </p>
            </div>

            <SessionHistory />
          </div>
        </div>
      </section>
    </AuthGuard>
  );
}