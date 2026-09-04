"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import AuthGuard from "@/components/AuthGuard";

import StudentSidebar from "@/components/student/StudentSidebar";
import WelcomeBanner from "@/components/student/WelcomeBanner";
import DashboardStats from "@/components/student/DashboardStats";
import RecentAssessment from "@/components/student/RecentAssessment";
import UpcomingAppointment from "@/components/student/UpcomingAppointment";
import RecommendedSection from "@/components/student/RecommendedSection";
import QuickActions from "@/components/student/QuickActions";

interface Assessment {
  name?: string;
  date?: string;
  severity?: string;
  description?: string;
}

interface Appointment {
  professionalName?: string;
  professionalType?: string;
  date?: string;
  time?: string;
  mode?: string;
}

export default function StudentDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [assessment, setAssessment] =
    useState<Assessment | null>(null);

  const [appointment, setAppointment] =
    useState<Appointment | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const googleToken = searchParams.get("token");
    const userId = searchParams.get("userId");
    const role = searchParams.get("role");

    if (googleToken) {
      localStorage.setItem("token", googleToken);

      localStorage.setItem(
        "user",
        JSON.stringify({
          id: userId,
          role: role?.toLowerCase() || "student",
        })
      );

      router.replace("/student/dashboard");

      return;
    }

    const loadDashboard = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          router.replace("/login");
          return;
        }

        /*
         * Load dashboard information.
         *
         * IMPORTANT:
         * These endpoints must match the routes that exist
         * in your backend.
         */

        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        /*
         * Assessment
         */

        try {
          const assessmentResponse = await fetch(
            "http://localhost:5000/api/assessment",
            {
              method: "GET",
              headers,
            }
          );

          if (assessmentResponse.ok) {
            const assessmentData =
              await assessmentResponse.json();

            console.log(
              "Assessment data:",
              assessmentData
            );

            /*
             * We will map your actual backend response
             * after checking your assessment controller.
             */

            if (assessmentData) {
              setAssessment({
                name:
                  assessmentData.name ||
                  assessmentData.assessmentType ||
                  assessmentData.type,

                date:
                  assessmentData.date ||
                  assessmentData.completedAt,

                severity:
                  assessmentData.severity ||
                  assessmentData.result,

                description:
                  assessmentData.description,
              });
            }
          }
        } catch (error) {
          console.log(
            "Assessment data unavailable:",
            error
          );
        }

        /*
         * Appointment
         */

        try {
          const appointmentResponse = await fetch(
            "http://localhost:5000/api/book",
            {
              method: "GET",
              headers,
            }
          );

          if (appointmentResponse.ok) {
            const appointmentData =
              await appointmentResponse.json();

            console.log(
              "Appointment data:",
              appointmentData
            );

            /*
             * We will map your actual backend response
             * after checking your booking controller.
             */

            const data =
              Array.isArray(appointmentData)
                ? appointmentData[0]
                : appointmentData;

            if (data) {
              setAppointment({
                professionalName:
                  data.professionalName ||
                  data.counsellorName ||
                  data.doctorName,

                professionalType:
                  data.professionalType ||
                  data.specialization ||
                  data.role,

                date:
                  data.date ||
                  data.appointmentDate,

                time:
                  data.time ||
                  data.appointmentTime,

                mode:
                  data.mode ||
                  data.sessionType ||
                  "Online Session",
              });
            }
          }
        } catch (error) {
          console.log(
            "Appointment data unavailable:",
            error
          );
        }
      } catch (error) {
        console.error(
          "Dashboard loading error:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [searchParams, router]);

  const assessmentCompleted =
    assessment !== null;

  return (
    <AuthGuard allowedRoles={["student"]}>
      <div className="min-h-screen bg-[#f4fbfa]">


        <div className="flex">

          <StudentSidebar />

          <main className="flex-1 min-w-0 p-5 md:p-8">
            <div className="max-w-7xl mx-auto">

              <WelcomeBanner />

              {loading ? (
                <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                  {[1, 2, 3, 4].map((item) => (
                    <div
                      key={item}
                      className="
                        h-40
                        bg-white
                        rounded-2xl
                        border
                        border-blue-100
                        animate-pulse
                      "
                    />
                  ))}
                </div>
              ) : (
                <DashboardStats
                  assessmentCompleted={
                    assessmentCompleted
                  }
                  assessmentName={
                    assessment?.name
                  }
                  wellbeingStatus={
                    assessment?.severity
                  }
                  appointmentDate={
                    appointment?.date
                  }
                  appointmentTime={
                    appointment?.time
                  }
                />
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">

                <RecentAssessment
                  assessment={assessment}
                />

                <UpcomingAppointment
                  appointment={appointment}
                />

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