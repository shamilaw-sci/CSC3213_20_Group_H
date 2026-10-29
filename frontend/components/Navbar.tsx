"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  MessageCircle,
  ChevronDown,
  Clock,
  History,
  LayoutDashboard,
  LogOut,
  PhoneCall,
  Shield,
  User,
} from "lucide-react";
import { getToken, logout } from "@/services/api";

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = getToken();
    const role = localStorage.getItem("role");

    if (token) {
      setIsLoggedIn(true);

      if (
        role &&
        ["admin", "supervisor"].includes(
          role.toLowerCase()
        )
      ) {
        setIsAdmin(true);
      }
    }

    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target as Node
        )
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-50 flex justify-between items-center px-6 md:px-12 py-4 bg-white border-b shadow-sm">
      <div className="flex items-center gap-8">
        <Link
          href="/"
          className="text-2xl font-bold text-blue-700"
        >
          CareBridge
        </Link>

        {isLoggedIn && (
          <nav className="hidden lg:flex items-center gap-2">
            <Link
              href="/chat"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              <MessageCircle size={16} />
              Chat
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              <LayoutDashboard size={16} />
              Overview
            </Link>

            <Link
              href="/booking"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              <Calendar size={16} />
              Booking
            </Link>

            <Link
              href="/availability-management"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              <Clock size={16} />
              Availability
            </Link>

            <Link
              href="/session-history"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              <History size={16} />
              History
            </Link>

            <Link
              href="/voice-call"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              <PhoneCall size={16} />
              Voice Call
            </Link>
          </nav>
        )}
      </div>

      <div className="flex items-center">
        {!isLoggedIn ? (
          <div className="flex items-center gap-4">
            <Link
              href="/features"
              className="hover:text-blue-600"
            >
              Features
            </Link>

            <Link
              href="/login"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <div
            className="relative"
            ref={dropdownRef}
          >
            <button
              onClick={() =>
                setDropdownOpen(!dropdownOpen)
              }
              className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-gray-100"
            >
              <User size={18} />

              <span className="hidden sm:block">
                Account
              </span>

              <ChevronDown
                size={16}
                className={`transition-transform ${
                  dropdownOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border rounded-xl shadow-lg overflow-hidden">
                {isAdmin && (
                  <Link
                    href="/admin/dashboard"
                    onClick={() =>
                      setDropdownOpen(false)
                    }
                    className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50"
                  >
                    <Shield size={16} />
                    Admin Dashboard
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}