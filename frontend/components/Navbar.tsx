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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const checkUser = () => {
        const token = getToken();

        if (token) {
            const decoded = decodeToken(token);

            if (decoded) {
                setIsLoggedIn(true);
                setUserName(decoded.name || "User");

                const role = (decoded.role || "").toLowerCase();
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
        document.removeEventListener("mousedown", handleClickOutside);
    };
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

            {/* Student Navigation */}
            {userRole === "student" && (
              <>
                <Link href="/chat" className="px-3 py-1.5 rounded-lg hover:text-indigo-600 hover:bg-gray-50 transition-all flex items-center gap-1.5">
                  <MessageCircle size={14} /> Chat
                </Link>

                <Link href="/student/dashboard" className="px-3 py-1.5 rounded-lg hover:text-indigo-600 hover:bg-gray-50 transition-all flex items-center gap-1.5">
                  <LayoutDashboard size={14} /> Dashboard
                </Link>

                <Link href="/booking" className="px-3 py-1.5 rounded-lg hover:text-indigo-600 hover:bg-gray-50 transition-all flex items-center gap-1.5">
                  <Calendar size={14} /> Booking
                </Link>

                <Link href="/session-history" className="px-3 py-1.5 rounded-lg hover:text-indigo-600 hover:bg-gray-50 transition-all flex items-center gap-1.5">
                  <History size={14} /> History
                </Link>

                <Link href="/voice-call" className="px-3 py-1.5 rounded-lg hover:text-indigo-600 hover:bg-gray-50 transition-all flex items-center gap-1.5">
                  <PhoneCall size={14} /> Voice Call
                </Link>
              </>
            )}

            {/* Anonymous Navigation */}
            {userRole === "anonymous" && (
              <Link href="/chat" className="px-3 py-1.5 rounded-lg hover:text-indigo-600 hover:bg-gray-50 transition-all flex items-center gap-1.5">
                <MessageCircle size={14} /> Chat
              </Link>
            )}

                        {/* Counsellor Navigation */}
            {userRole === "counsellor" && (
              <>
                <Link
                  href="/counsellor/dashboard"
                  className="px-3 py-1.5 rounded-lg hover:text-indigo-600 hover:bg-gray-50 transition-all flex items-center gap-1.5"
                >
                  <LayoutDashboard size={14} /> Counsellor Dashboard
                </Link>

                <Link
                  href="/booking"
                  className="px-3 py-1.5 rounded-lg hover:text-indigo-600 hover:bg-gray-50 transition-all flex items-center gap-1.5"
                >
                  <Calendar size={14} /> Appointments
                </Link>

                <Link
                  href="/availability"
                  className="px-3 py-1.5 rounded-lg hover:text-indigo-600 hover:bg-gray-50 transition-all flex items-center gap-1.5"
                >
                  <Clock size={14} /> Availability
                </Link>
              </>
            )}
            {isAdmin && (
              <Link
                href="/admin/dashboard"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-indigo-600 hover:bg-gray-50 transition-colors"
              >
                <Shield size={14} /> Admin Dashboard
              </Link>
            )}

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
              href="/#how-it-works"
              className="hover:text-indigo-600 transition-colors"
            >
              How it works
            </Link>
            <Link
              href="/#about"
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
                {userRole === "admin" || userRole === "supervisor" ? (
                  <Shield size={14} />
                ) : (
                  <User size={14} />
                )}
              </div>
              <span className="text-xs font-semibold hidden sm:inline">
              {userName || "Account"}
            </span>
              <ChevronDown
                size={13}
                className={`text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-bold text-gray-800">
                    {userName || "User"}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {userRole}
                  </p>
                </div>
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

                {userRole === "counsellor" && (
                  <>
                    <Link
                      href="/counsellor/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <LayoutDashboard size={14} />
                      Counsellor Dashboard
                    </Link>

                    <Link
                      href="/availability"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <Clock size={14} />
                      Availability
                    </Link>
                  </>
                )}

                {userRole === "anonymous" && (
                  <Link
                    href="/login"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    <User size={14} /> Sign In
                  </Link>
                )}

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
