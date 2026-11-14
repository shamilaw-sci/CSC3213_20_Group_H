
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { logout } from "@/lib/auth";

export default function CounsellorDashboard() {
  const router = useRouter();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isCounsellor, setIsCounsellor] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const role = String(user.role || "").toLowerCase();

      if (role === "counsellor") {
        setIsCounsellor(true);
        setUserName(user.name || "Counsellor");
      }
    } catch {
      setIsCounsellor(false);
    } finally {
      setIsCheckingAuth(false);
    }
  }, [router]);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  if (isCheckingAuth) {
    return <div className="p-10">Loading dashboard...</div>;
  }

  if (!isCounsellor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p>You do not have permission to access this page.</p>
        <Link href="/dashboard" className="text-violet-600 underline">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Counsellor Dashboard
            </h1>
            <p className="text-gray-500 mt-2">
              Welcome back, {userName}!
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-5 py-2 rounded-lg hover:bg-red-600"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800">
              Appointments
            </h2>
            <p className="text-gray-500 mt-2">
              View and manage your appointments.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800">
              Student Requests
            </h2>
            <p className="text-gray-500 mt-2">
              Review student counselling requests.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800">
              Availability
            </h2>
            <p className="text-gray-500 mt-2">
              Manage your counselling availability.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
