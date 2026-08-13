export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-16">
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
          About
        </p>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">About CareBridge</h1>

        <div className="space-y-5 text-gray-700 leading-7">
          <p>
            CareBridge is a digital well-being platform designed to make mental health support more
            accessible, responsive, and user-friendly.
          </p>
          <p>
            The platform supports students by combining counselling scheduling, emergency guidance,
            and administrative monitoring in one place.
          </p>
          <p>
            Our aim is to create a calm, safe, and supportive environment where people can seek help
            without unnecessary barriers.
          </p>
        </div>
      </div>
    </main>
  );
}
