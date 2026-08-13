"use client";

import { useEffect, useState } from "react";
import { Nunito } from "next/font/google";
import Link from "next/link";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <nav
      className={`${nunito.className} p-4 px-10 flex justify-between items-center`}
    >
      <h1 className="font-bold text-2xl">
        <Link href="/">CareBridge</Link>
      </h1>

      <ul className="flex gap-4 font-bold items-center">
        <li>
          <Link href="/features">Features</Link>
        </li>

        <li>
          <Link href="/how-it-works">How it works</Link>
        </li>

        <li>
          <Link href="/about">About</Link>
        </li>

        <li>
          <Link href="/contact">Contact</Link>
        </li>

        {isLoggedIn ? (
          <>
            <li>
              <Link href="/chat">Chat</Link>
            </li>

            <li>
              <Link href="/availability">Availability</Link>
            </li>

            <li>
              <Link href="/booking">Booking</Link>
            </li>

            <li>
              <Link href="/session-history">Session History</Link>
            </li>

            <li>
              <Link href="/voice-call">Voice Call</Link>
            </li>

            <li>
              <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700"
              >
                Logout
              </button>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link href="/login">Login</Link>
            </li>

            <li>
              <Link href="/register">Sign Up</Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}
