"use client";

import Link from "next/link";

interface RecentAssessmentProps {
  assessment: {
    name?: string;
    date?: string;
    severity?: string;
    description?: string;
  } | null;
}

export default function RecentAssessment({
  assessment,
}: RecentAssessmentProps) {
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

      {assessment ? (
        <div>
          <h4 className="text-lg font-semibold text-gray-800">
            {assessment.name || "Assessment"}
          </h4>

          {assessment.date && (
            <p className="text-sm text-gray-500 mt-1">
              Completed on {assessment.date}
            </p>
          )}

          {assessment.severity && (
            <span className="inline-flex items-center gap-2 mt-4 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {assessment.severity}
            </span>
          )}

          {assessment.description && (
            <p className="text-gray-600 mt-4 leading-relaxed">
              {assessment.description}
            </p>
          )}

          <Link
            href="/student/results"
            className="
              inline-block
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
              font-medium
            "
          >
            View Results →
          </Link>
        </div>
      ) : (
        <div className="text-center py-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center text-3xl mb-4">
            📝
          </div>

          <h4 className="text-lg font-semibold text-gray-800">
            No assessment completed yet
          </h4>

          <p className="text-sm text-gray-500 mt-2">
            Complete an assessment to understand your current wellbeing.
          </p>

          <Link
            href="/student/assessments"
            className="
              inline-block
              mt-5
              px-5
              py-2.5
              rounded-xl
              bg-blue-600
              text-white
              hover:bg-blue-700
              transition-colors
              font-semibold
            "
          >
            Take Assessment →
          </Link>
        </div>
      )}
    </section>
  );
}