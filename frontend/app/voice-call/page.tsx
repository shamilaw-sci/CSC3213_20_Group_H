import AuthGuard from "@/components/AuthGuard";
import VoiceCall from "@/components/VoiceCall";

import {
  PhoneCall,
  Mic,
  ShieldCheck,
  Headphones,
} from "lucide-react";

export default function VoiceCallPage() {
  return (
    <AuthGuard>
      <section className="min-h-screen bg-gray-50 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-indigo-100 mb-5">
              <PhoneCall
                size={40}
                className="text-indigo-600"
              />
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900">
              Voice Call Counselling
            </h1>

            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              Connect directly with certified mental health
              professionals through secure real-time
              WebRTC voice communication.
            </p>
          </div>

          {/* Information Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <Mic
                size={30}
                className="text-indigo-600 mb-3"
              />

              <h3 className="font-bold text-lg text-gray-900">
                Real-Time Audio
              </h3>

              <p className="text-gray-600 text-sm mt-2">
                WebRTC enables low-latency voice
                communication between counsellors
                and students.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <Headphones
                size={30}
                className="text-purple-600 mb-3"
              />

              <h3 className="font-bold text-lg text-gray-900">
                Professional Support
              </h3>

              <p className="text-gray-600 text-sm mt-2">
                Speak privately with qualified
                counsellors during scheduled
                appointments.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <ShieldCheck
                size={30}
                className="text-emerald-600 mb-3"
              />

              <h3 className="font-bold text-lg text-gray-900">
                Secure Sessions
              </h3>

              <p className="text-gray-600 text-sm mt-2">
                Calls use encrypted peer-to-peer
                WebRTC connections for privacy
                and confidentiality.
              </p>
            </div>
          </div>

          {/* Call Module */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="mb-8">
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                CareBridge Communication
              </span>

              <h2 className="text-2xl font-bold text-gray-900 mt-4">
                Voice Counselling Session
              </h2>

              <p className="text-gray-600 mt-2">
                Start a secure WebRTC counselling
                session with your assigned
                counsellor.
              </p>
            </div>

            <VoiceCall />
          </div>

          {/* Session Notes */}
          <div className="mt-8 bg-blue-50 border border-blue-100 rounded-2xl p-6">
            <h3 className="font-bold text-blue-800 mb-2">
              Before Starting
            </h3>

            <ul className="text-sm text-blue-700 space-y-2 list-disc pl-5">
              <li>
                Ensure microphone permission is
                enabled in your browser.
              </li>

              <li>
                Use Chrome, Edge, or Firefox for
                best WebRTC compatibility.
              </li>

              <li>
                Join the same session room as the
                counsellor.
              </li>

              <li>
                Verify your appointment is
                scheduled before starting the
                call.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </AuthGuard>
  );
}