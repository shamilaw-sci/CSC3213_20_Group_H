"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Calendar,
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
        (role.toLowerCase() === "admin" || role.toLowerCase() === "supervisor")
      ) {
        setIsAdmin(true);
      }
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-50 flex justify-between items-center px-6 md:px-12 py-4 bg-white/70 backdrop-blur-md border-b border-gray-100/80">
      {/* Brand & Clean Nav Links */}
      <div className="flex items-center gap-8">
        <Link
          href="/"
          className="text-xl font-extrabold text-gray-900 tracking-tight"
        >
          CareBridge
        </Link>

        {isLoggedIn && (
          <nav className="hidden lg:flex items-center gap-1 text-xs font-semibold text-gray-600">
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-lg hover:text-indigo-600 hover:bg-gray-50 transition-all flex items-center gap-1.5"
            >
              <LayoutDashboard size={14} /> Overview
            </Link>
            <Link
              href="/booking"
              className="px-3 py-1.5 rounded-lg hover:text-indigo-600 hover:bg-gray-50 transition-all flex items-center gap-1.5"
            >
              <Calendar size={14} /> Booking
            </Link>
            <Link
              href="/availabilty"
              className="px-3 py-1.5 rounded-lg hover:text-indigo-600 hover:bg-gray-50 transition-all flex items-center gap-1.5"
            >
              <Clock size={14} /> Availability
            </Link>
            <Link
              href="/session-history"
              className="px-3 py-1.5 rounded-lg hover:text-indigo-600 hover:bg-gray-50 transition-all flex items-center gap-1.5"
            >
              <History size={14} /> History
            </Link>
            <Link
              href="/voice-call"
              className="px-3 py-1.5 rounded-lg hover:text-indigo-600 hover:bg-gray-50 transition-all flex items-center gap-1.5"
            >
              <PhoneCall size={14} /> Voice Call
            </Link>
          </nav>
        )}
      </div>

      {/* Right Action Section */}
      <div className="flex items-center gap-4">
        {!isLoggedIn ? (
          <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-gray-600">
            <Link
              href="/features"
              className="hover:text-indigo-600 transition-colors"
            >
              Features
            </Link>
            <Link
              href="/how-it-works"
              className="hover:text-indigo-600 transition-colors"
            >
              How it works
            </Link>
            <Link
              href="/about"
              className="hover:text-indigo-600 transition-colors"
            >
              About
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 py-1 px-2.5 rounded-full hover:bg-gray-50 transition-all cursor-pointer text-gray-700"
            >
              <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs">
                <User size={14} />
              </div>
              <span className="text-xs font-semibold hidden sm:inline">
                Account
              </span>
              <ChevronDown
                size={13}
                className={`text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                {isAdmin && (
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-indigo-600 hover:bg-gray-50 transition-colors"
                  >
                    <Shield size={14} /> Admin Dashboard
                  </Link>
                )}

                <div className="border-t border-gray-50 my-1"></div>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50/50 transition-colors text-left cursor-pointer"
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}