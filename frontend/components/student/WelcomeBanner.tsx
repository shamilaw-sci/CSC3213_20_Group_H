
"use client";

import { useEffect, useState } from "react";

export default function WelcomeBanner() {
  const [userName, setUserName] = useState("Student");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [greeting, setGreeting] = useState("Welcome");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserName(user.name || "Student");
        setIsAnonymous(Boolean(user.isAnonymous));
      } catch {
        setUserName("Student");
      }
    }

    const hour = new Date().getHours();

    if (hour < 12) {
      setGreeting("Good morning");
    } else if (hour < 17) {
      setGreeting("Good afternoon");
    } else {
      setGreeting("Good evening");
    }
  }, []);

  return (
    <section className="rounded-2xl border border-[#e5e5e5] bg-white px-7 py-9 md:px-10 md:py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#777777]">
        STUDENT DASHBOARD
      </p>

      <h1 className="mt-4 text-3xl font-bold leading-tight text-[#171717] md:text-4xl">
        {greeting}, {userName} 🤍
      </h1>

      <p className="mt-5 max-w-2xl text-base leading-8 text-[#555555]">
        {isAnonymous
          ? "This is your space to pause, reflect and take care of yourself. Your privacy matters, and support is always here when you need it."
          : "Take a gentle moment for yourself. Your wellbeing matters, your feelings are important, and you deserve kindness and support every step of the way."}
      </p>

      <p className="mt-5 text-sm font-semibold text-[#333333]">
        Take a deep breath. You're doing better than you think.
      </p>
    </section>
  );
}
