export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16">
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
          How it works
        </p>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          How CareBridge works
        </h1>

        <div className="space-y-5 text-gray-700 leading-7">
          <p>
            CareBridge connects students with mental health support in a simple
            and secure way.
          </p>
          <p>
            Students can register, log in, and access a supportive dashboard
            where they can view counselling options, book sessions, and manage
            availability.
          </p>
          <p>
            When a student needs urgent help, the system can detect risk
            indicators and guide them toward emergency support quickly and
            responsibly.
          </p>
          <p>
            Counsellors and administrators can review activity, monitor support
            workflows, and manage the platform with clear oversight.
          </p>
        </div>
      </div>
    </main>
  );
}
