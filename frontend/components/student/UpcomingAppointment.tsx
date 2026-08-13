export default function UpcomingAppointment() {
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

      <div className="flex items-start gap-4">
        <div className="w-14 h-14 shrink-0 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-2xl">
          👩‍⚕️
        </div>

        <div>
          <h4 className="text-lg font-semibold text-gray-800">
            Dr. Amanda Perera
          </h4>

          <p className="text-sm text-gray-500">
            Clinical Psychologist
          </p>

          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-600">
              📅 Aug 12, 2026
            </p>

            <p className="text-sm text-gray-600">
              🕙 10:00 AM
            </p>

            <p className="text-sm text-gray-600">
              💻 Online Session
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-6">
        <button
          type="button"
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-700 hover:to-cyan-600 transition-all font-semibold shadow-sm"
        >
          Join Session
        </button>

        <button
          type="button"
          className="px-4 py-2.5 rounded-xl border border-cyan-300 text-cyan-700 hover:bg-cyan-50 transition-colors font-medium"
        >
          View Details →
        </button>
      </div>
    </section>
  );
}