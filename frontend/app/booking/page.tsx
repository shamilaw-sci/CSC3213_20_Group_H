import AuthGuard from "@/components/AuthGuard";
import AppointmentBooking from "@/components/AppointmentBooking";

import { Nunito } from "next/font/google";
import {
  Calendar,
  Clock,
  UserCheck,
  ShieldCheck,
} from "lucide-react";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export default function BookingPage() {
  return (
    <AuthGuard>
      <section
        className={`${nunito.className} min-h-screen bg-gray-50 py-16 px-6`}
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-blue-100 mb-5">
              <Calendar size={40} className="text-blue-600" />
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900">
              Appointment Booking
            </h1>

            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              Schedule counseling sessions with verified
              mental health professionals and manage your
              upcoming appointments securely.
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <Clock
                size={30}
                className="text-blue-600 mb-3"
              />

              <h3 className="font-bold text-lg text-gray-900">
                Flexible Scheduling
              </h3>

              <p className="text-gray-600 text-sm mt-2">
                Choose available time slots that fit your
                academic and personal schedule.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <UserCheck
                size={30}
                className="text-emerald-600 mb-3"
              />

              <h3 className="font-bold text-lg text-gray-900">
                Verified Professionals
              </h3>

              <p className="text-gray-600 text-sm mt-2">
                Connect with qualified counselors and
                mental health experts.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <ShieldCheck
                size={30}
                className="text-purple-600 mb-3"
              />

              <h3 className="font-bold text-lg text-gray-900">
                Private & Secure
              </h3>

              <p className="text-gray-600 text-sm mt-2">
                All appointments are protected with
                secure authentication and privacy controls.
              </p>
            </div>
          </div>

          {/* Booking Module */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="mb-8">
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                CareBridge Scheduling
              </span>

              <h2 className="text-2xl font-bold text-gray-900 mt-4">
                Book Your Session
              </h2>

              <p className="text-gray-600 mt-2">
                Select a counselor, available date, and
                preferred time slot to confirm a session.
              </p>
            </div>

            <AppointmentBooking />
          </div>
        </div>
      </section>
    </AuthGuard>
  );
}