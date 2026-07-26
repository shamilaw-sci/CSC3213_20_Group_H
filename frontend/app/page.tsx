export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(191,219,254,0.35),transparent_60%)] px-6 py-16 text-slate-800 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <section className="rounded-4xl border border-slate-200 bg-white/80 px-8 py-12 shadow-sm backdrop-blur sm:px-12 lg:px-16">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 text-sm font-medium uppercase tracking-[0.3em] text-sky-600">
                CareBridge
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                A gentler way to check in with yourself.
              </h1>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Support that feels calm, clear, and human. We help students
                explore how they’re doing, find steady support, and reach out
                when they need it.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="/login"
                className="rounded-full bg-sky-600 px-6 py-3 text-center text-sm font-medium text-white transition hover:bg-sky-700"
              >
                Sign in
              </a>
              <a
                href="/register"
                className="rounded-full border border-slate-300 px-6 py-3 text-center text-sm font-medium text-slate-700 transition hover:border-sky-400 hover:text-sky-700"
              >
                Create account
              </a>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">
              Small steps, steady care
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Whether you need a quiet moment to reflect or quick access to
              professional help, CareBridge makes support feel approachable and
              reassuring.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-sky-100 bg-sky-50 p-8 shadow-sm">
            <ul className="space-y-4 text-sm text-slate-700">
              <li className="flex gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-sky-500" />
                <span>
                  Gentle self-checks that encourage reflection without pressure.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-sky-500" />
                <span>
                  Accessible guidance for reaching out to trusted support.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-sky-500" />
                <span>
                  Clear next steps for urgent moments and everyday wellbeing.
                </span>
              </li>
            </ul>
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500">
          <a
            href="https://www.facebook.com/carebridge"
            target="_blank"
            className="transition hover:text-sky-600"
          >
            Facebook
          </a>
          <a
            href="https://www.linkedin.com/company/carebridge"
            target="_blank"
            className="transition hover:text-sky-600"
          >
            LinkedIn
          </a>
          <a
            href="https://www.instagram.com/carebridge"
            target="_blank"
            className="transition hover:text-sky-600"
          >
            Instagram
          </a>
          <a
            href="https://www.youtube.com/@carebridge"
            target="_blank"
            className="transition hover:text-sky-600"
          >
            YouTube
          </a>
        </section>
      </div>
    </main>
  );
}
