export default function RecentAssessment() {
  return (
    <section className="bg-white rounded-2xl border border-blue-100 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-800">
          Recent Assessment
        </h3>

        <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-2xl">
          📋
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div>
          <h4 className="text-lg font-semibold text-gray-800">
            PHQ-9 Assessment
          </h4>

          <p className="text-sm text-gray-500 mt-1">
            Completed on Aug 5, 2026
          </p>

          {/* Assessment Status */}
          <span className="inline-flex items-center gap-2 mt-4 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Moderate
          </span>

          <p className="text-gray-600 mt-4 leading-relaxed">
            Your assessment indicates moderate symptoms. Consider checking in
            with a mental health professional.
          </p>

          <button
            type="button"
            className="
              mt-5
              px-5
              py-2.5
              rounded-xl
              border
              border-blue-200
              text-blue-600
              hover:bg-blue-50
              hover:border-blue-300
              transition-all
              duration-200
              font-medium
            "
          >
            View Results →
          </button>
        </div>
      </div>
    </section>
  );
}