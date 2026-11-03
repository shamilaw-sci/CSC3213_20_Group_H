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
  const [role, setRole] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncAuthState = () => {
      const token = getToken();
      const currentRole = localStorage.getItem("role");

      setIsLoggedIn(!!token);
      setRole(currentRole);

      setIsAdmin(
        !!token &&
          !!currentRole &&
          ["admin", "supervisor"].includes(currentRole.toLowerCase()),
      );
    };

    // Check authentication when Navbar mounts
    syncAuthState();

    // Listen for login/logout changes in this tab
    window.addEventListener("authChange", syncAuthState);

    // Handle authentication changes from another browser tab
    window.addEventListener("storage", syncAuthState);

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("authChange", syncAuthState);
      window.removeEventListener("storage", syncAuthState);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();

    window.dispatchEvent(new Event("authChange"));

    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-50 flex justify-between items-center px-6 md:px-12 py-4 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
      <div className="flex items-center gap-8">
        <Link
          href="/"
          className="text-2xl font-extrabold tracking-tight text-blue-700 transition-colors hover:text-blue-800"
        >
          CareBridge
        </Link>

        {isLoggedIn && (
          <nav className="hidden lg:flex items-center gap-1">
            <Link
              href="/chat"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
            >
              <MessageCircle size={16} />
              Chat
            </Link>

            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
            >
              <LayoutDashboard size={16} />
              Overview
            </Link>

            <Link
              href="/booking"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
            >
              <Calendar size={16} />
              Booking
            </Link>

            <Link
              href="/availability-management"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
            >
              <Clock size={16} />
              Availability
            </Link>

            <Link
              href="/session-history"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
            >
              <History size={16} />
              History
            </Link>

            <Link
              href="/voice-call"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
            >
              <PhoneCall size={16} />
              Voice Call
            </Link>

            {/* For easy access of counsellors */}
            {role === "counsellor" && (
              <Link
                href="/counsellor/dashboard"
                className="px-3 py-2 rounded-lg text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
              >
                Counsellor Portal
              </Link>
            )}
          </nav>
        )}
      </div>

      <div className="flex items-center">
        {!isLoggedIn ? (
          <div className="flex items-center gap-4">
            <Link
              href="/features"
              className="text-gray-600 transition-colors hover:text-blue-600"
            >
              Features
            </Link>

            <Link
              href="/login"
              className="rounded-full bg-blue-600 px-5 py-2 font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-gray-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <User size={18} />

              <span className="hidden sm:block">Account</span>

              <ChevronDown
                size={16}
                className={`transition-transform ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
                {isAdmin && (
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setDropdownOpen(false)}
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
