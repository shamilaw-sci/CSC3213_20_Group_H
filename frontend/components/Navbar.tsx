
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

interface JwtPayload {
  id?: number;
  name?: string;
  role?: string;
}

function decodeToken(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64);
    const bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0));

    return JSON.parse(new TextDecoder().decode(bytes)) as JwtPayload;
  } catch {
    return null;
  }
}

export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkUser = () => {
      const token = getToken();

      if (token) {
        const decoded = decodeToken(token);

        if (decoded) {
          const role = (decoded.role || "").toLowerCase();

          setIsLoggedIn(true);
          setUserName(decoded.name || "User");
          setUserRole(role);
          setIsAdmin(role === "admin" || role === "supervisor");
        } else {
          setIsLoggedIn(false);
          setUserName("");
          setUserRole("");
          setIsAdmin(false);
        }
      } else {
        setIsLoggedIn(false);
        setUserName("");
        setUserRole("");
        setIsAdmin(false);
      }
    };

    checkUser();

    window.addEventListener("auth-changed", checkUser);
    window.addEventListener("authChange", checkUser);
    window.addEventListener("storage", checkUser);

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
      window.removeEventListener("auth-changed", checkUser);
      window.removeEventListener("authChange", checkUser);
      window.removeEventListener("storage", checkUser);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    window.dispatchEvent(new Event("auth-changed"));
    window.dispatchEvent(new Event("authChange"));
    window.location.href = "/login";
  };

  const navLinkClass =
    "flex items-center gap-2 rounded-lg px-3 py-2 text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-700";

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-100 bg-white/95 px-6 py-4 shadow-sm backdrop-blur md:px-12">
      <div className="flex items-center gap-8">
        <Link
          href="/"
          className="text-2xl font-extrabold tracking-tight text-blue-700 transition-colors hover:text-blue-800"
        >
          CareBridge
        </Link>

        {isLoggedIn && (
          <nav className="hidden items-center gap-1 lg:flex">
            {userRole === "student" && (
              <>
                <Link href="/chat" className={navLinkClass}>
                  <MessageCircle size={16} />
                  Chat
                </Link>

                <Link href="/student/dashboard" className={navLinkClass}>
                  <LayoutDashboard size={16} />
                  Dashboard
                </Link>

                <Link href="/booking" className={navLinkClass}>
                  <Calendar size={16} />
                  Booking
                </Link>

                <Link href="/session-history" className={navLinkClass}>
                  <History size={16} />
                  History
                </Link>

                <Link href="/voice-call" className={navLinkClass}>
                  <PhoneCall size={16} />
                  Voice Call
                </Link>
              </>
            )}

            {userRole === "anonymous" && (
              <Link href="/chat" className={navLinkClass}>
                <MessageCircle size={16} />
                Chat
              </Link>
            )}

            {userRole === "counsellor" && (        //what see only to counsellor
              <>
                <Link href="/counsellor/dashboard" className={navLinkClass}>
                  <LayoutDashboard size={16} />
                  Counsellor Dashboard
                </Link>

                <Link href="/booking" className={navLinkClass}>
                  <Calendar size={16} />
                  Appointments
                </Link>

                <Link href="/availability" className={navLinkClass}>
                  <Clock size={16} />
                  Availability
                </Link>
              </>
            )}

            {isAdmin && (
              <Link
                href="/admin/dashboard"
                onClick={() => setDropdownOpen(false)}
                className={navLinkClass}
              >
                <Shield size={16} />
                Admin Dashboard
              </Link>
            )}
          </nav>
        )}
      </div>

      <div className="flex items-center">
        {!isLoggedIn ? (
          <div className="flex items-center gap-4 text-sm font-medium">
            <Link
              href="/features"
              className="text-gray-600 transition-colors hover:text-blue-600"
            >
              Features
            </Link>

            <Link
              href="/#how-it-works"
              className="hidden text-gray-600 transition-colors hover:text-blue-600 md:block"
            >
              How it works
            </Link>

            <Link
              href="/#about"
              className="hidden text-gray-600 transition-colors hover:text-blue-600 md:block"
            >
              About
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
              {userRole === "admin" || userRole === "supervisor" ? (
                <Shield size={18} />
              ) : (
                <User size={18} />
              )}

              <span className="hidden text-sm font-semibold sm:block">
                {userName || "Account"}
              </span>

              <ChevronDown
                size={16}
                className={`transition-transform ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="text-sm font-bold text-gray-800">
                    {userName || "User"}
                  </p>
                  <p className="text-xs capitalize text-gray-500">
                    {userRole}
                  </p>
                </div>

                {isAdmin && (
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Shield size={16} />
                    Admin Dashboard
                  </Link>
                )}

                {userRole === "counsellor" && (
                  <>
                    <Link
                      href="/counsellor/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <LayoutDashboard size={16} />
                      Counsellor Dashboard
                    </Link>

                    <Link
                      href="/availability"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Clock size={16} />
                      Availability
                    </Link>
                  </>
                )}

                {userRole === "anonymous" && (
                  <Link
                    href="/login"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-blue-700 hover:bg-blue-50"
                  >
                    <User size={16} />
                    Sign In
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-red-600 hover:bg-red-50"
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
