"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AnonymousPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">
          Anonymous Session
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          You are browsing anonymously. Your activity is not linked to any
          account.
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-500 transition-colors"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
