"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";

import StudentSidebar from "@/components/student/StudentSidebar";
import WelcomeBanner from "@/components/student/WelcomeBanner";
import DashboardStats from "@/components/student/DashboardStats";
import RecentAssessment from "@/components/student/RecentAssessment";
import UpcomingAppointment from "@/components/student/UpcomingAppointment";
import RecommendedSection from "@/components/student/RecommendedSection";
import QuickActions from "@/components/student/QuickActions";

export default function StudentDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const userId = searchParams.get("userId");
    const role = searchParams.get("role");

    // Google login returned a token
    if (token) {
      localStorage.setItem("token", token);

      localStorage.setItem(
        "user",
        JSON.stringify({
          id: userId,
          role: role?.toLowerCase() || "student",
        }),
      );

      // Remove token from URL after saving it
      router.replace("/student/dashboard");
    }
  }, [searchParams, router]);

  return (
    <AuthGuard allowedRoles={["student"]}>
      <div className="min-h-screen bg-gray-50">

        {/* Top Navigation */}
        <Navbar />

        <div className="flex">
          {/* Student Sidebar */}
          <StudentSidebar />

          {/* Main Dashboard */}
          <main className="flex-1 min-w-0 p-5 md:p-8">
            <div className="max-w-7xl mx-auto">

              <WelcomeBanner />

              <DashboardStats />

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                <RecentAssessment />
                <UpcomingAppointment />
              </div>

              <RecommendedSection />

              <QuickActions />

            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}