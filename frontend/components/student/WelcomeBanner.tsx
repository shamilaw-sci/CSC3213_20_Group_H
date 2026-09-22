"use client";

import { useEffect, useState } from "react";

export default function WelcomeBanner() {
  const [userName, setUserName] = useState("Student");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [greeting, setGreeting] = useState("Good morning");

  useEffect(() => {
    const userData = localStorage.getItem("user");

    if (userData) {
      try {
        const user = JSON.parse(userData);

        if (user.name) {
          setUserName(user.name);
        }

        if (user.isAnonymous === true) {
          setIsAnonymous(true);
          setUserName(user.name || "Anonymous User");
        }
      } catch (error) {
        console.error(
          "Unable to read user information:",
          error
        );
      }
    }

    const updateGreeting = () => {
      const hour = new Date().getHours();

      if (hour >= 5 && hour < 12) {
        setGreeting("Good morning");
      } else if (hour >= 12 && hour < 17) {
        setGreeting("Good afternoon");
      } else {
        setGreeting("Good evening");
      }
    };

    updateGreeting();
  }, []);

  return (
    <section className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white p-6 md:p-8 shadow-lg">
      <div className="flex items-center justify-between gap-6">
        <div>
          <p className="text-sm font-semibold text-blue-100 mb-2">
            Student Dashboard
          </p>

          <h2 className="text-3xl md:text-4xl font-bold">
            {greeting}, {userName} 👋
          </h2>

          <p className="mt-3 text-blue-50 max-w-xl leading-relaxed">
            {isAnonymous
              ? "You're using CareBridge anonymously. You can explore support and wellbeing services without creating a personal profile."
              : "Take a moment to check in with yourself and keep taking care of your wellbeing."}
          </p>
        </div>

        <div className="hidden md:flex w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm items-center justify-center text-4xl border border-white/20">
          🌱
        </div>
      </div>
    </section>
  );
}