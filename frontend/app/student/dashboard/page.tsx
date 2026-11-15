
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import AuthGuard from "@/components/AuthGuard";
import WelcomeBanner from "@/components/student/WelcomeBanner";

export default function StudentDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setIsAnonymous(user.isAnonymous === true);
      } catch {
        setIsAnonymous(false);
      }
    }
  }, []);

  // Handle Google OAuth callback
  useEffect(() => {
    const token = searchParams.get("token");
    const userId = searchParams.get("userId");
    const role = searchParams.get("role");

    if (token && userId) {
      localStorage.setItem("token", token);

      localStorage.setItem(
        "user",
        JSON.stringify({
          id: userId,
          role: role?.toLowerCase() || "student",
        })
      );

      router.replace("/student/dashboard");
    }
  }, [searchParams, router]);

  return (
    <AuthGuard allowedRoles={["student"]}>
      <main className="min-h-screen bg-white text-[#171717]">
        <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">

          {/* Welcome Banner */}
          <WelcomeBanner />

          {/* Supportive Message */}
          <section className="mt-12 max-w-4xl">
            <h2 className="text-2xl font-bold text-[#171717]">
              How are you feeling today?
            </h2>

            <div className="mt-5 space-y-4 text-base leading-8 text-[#555555]">
              <p>
                Life can sometimes feel overwhelming. There may be days
                when everything seems difficult, when you feel tired
                without knowing why, or when you simply need someone
                who understands.
              </p>

              <p>
                Please remember that you don't have to be okay all
                the time. Every feeling you experience matters, and
                it is okay to ask for support when you need it.
              </p>

              <p>
                You don't need to solve every problem today. Take
                things slowly. Give yourself permission to rest.
                Even getting through a difficult day is something
                worth recognising.
              </p>

              <p>
                Your current situation does not define your entire
                future. Better days are possible, and you deserve
                the opportunity to experience them.
              </p>

              <p className="font-semibold text-[#171717]">
                You are important. Your feelings are valid. And you
                deserve care, kindness and support.
              </p>
            </div>
          </section>

          
          {/* Main Actions */}
          {!isAnonymous && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-[#171717]">
              We're here for you
            </h2>

            <p className="mt-2 text-[#666666]">
              Whenever you feel ready, take a small step towards
              looking after yourself.
            </p>

            <div className="mt-6 grid gap-6 md:grid-cols-2">

              {/* Book Appointment Card */}
              <Link
                href="/booking"
                className="group rounded-2xl border border-[#e5e5e5] bg-white p-7 transition hover:border-[#999999] hover:shadow-md"
              >
                <div className="text-3xl">🌿</div>

                <h3 className="mt-4 text-xl font-bold text-[#171717]">
                  Book an Appointment
                </h3>

                <p className="mt-3 leading-7 text-[#666666]">
                  Connect with a counsellor and find a comfortable
                  space to talk about what is on your mind.
                </p>

                <span className="mt-5 inline-block font-semibold text-[#171717]">
                  Book Appointment →
                </span>
              </Link>

              {/* Open Chat Card */}
              <Link
                href="/chat"
                className="group rounded-2xl border border-[#e5e5e5] bg-white p-7 transition hover:border-[#999999] hover:shadow-md"
              >
                <div className="text-3xl">🤍</div>

                <h3 className="mt-4 text-xl font-bold text-[#171717]">
                  Open Chat
                </h3>

                <p className="mt-3 leading-7 text-[#666666]">
                  Sometimes sharing what's on your mind can make
                  things easier. Start a conversation whenever
                  you feel ready.
                </p>

                <span className="mt-5 inline-block font-semibold text-[#171717]">
                  Or open a chat →
                </span>
              </Link>

            </div>
          </section>
          )}


          {/* Gentle Reminders */}
          <section className="mt-14 border-t border-[#eeeeee] pt-9">
            <h2 className="text-xl font-bold text-[#171717]">
              A few gentle reminders
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                "You don't have to be perfect.",
                "Taking a break is productive too.",
                "Small progress is still progress.",
                "It is okay to ask for help.",
                "Your feelings deserve attention.",
                "Be kind to yourself today.",
              ].map((message, index) => (
                <div
                  key={index}
                  className="rounded-xl bg-[#f7f7f7] p-5 text-[#444444]"
                >
                  {message}
                </div>
              ))}
            </div>
          </section>

          {/* Closing Message */}
          <section className="mt-12 rounded-2xl bg-[#f7f7f7] p-7 text-center">
            <p className="mx-auto max-w-3xl leading-8 text-[#444444]">
              Your wellbeing matters. Whatever you are facing today,
              you deserve a moment of peace, someone who listens,
              and the support to take your next step.
            </p>

            <p className="mt-3 font-semibold text-[#171717]">
              Take it one day at a time. 🤍
            </p>
          </section>

        </div>
      </main>
    </AuthGuard>
  );
}
