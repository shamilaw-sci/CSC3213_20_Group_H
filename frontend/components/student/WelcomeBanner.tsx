export default function WelcomeBanner() {
  return (
    <section className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white p-6 md:p-8 shadow-lg">
      <div className="flex items-center justify-between gap-6">
        <div>
          <p className="text-sm font-semibold text-blue-100 mb-2">
            Student Dashboard
          </p>

          <h2 className="text-3xl md:text-4xl font-bold">
            Good morning, Hirushi 👋
          </h2>

          <p className="mt-3 text-blue-50 max-w-xl leading-relaxed">
            Take a moment to check in with yourself and keep taking care of
            your wellbeing.
          </p>
        </div>

        <div className="hidden md:flex w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm items-center justify-center text-4xl border border-white/20">
          🌱
        </div>
      </div>
    </section>
  );
}