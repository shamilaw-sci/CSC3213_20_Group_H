"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function StudentSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    {
      href: "/student/dashboard",
      icon: "🏠",
      label: "Dashboard",
    },
    {
      href: "/student/assessments",
      icon: "📝",
      label: "Assessments",
    },
    {
      href: "/student/results",
      icon: "📊",
      label: "My Results",
    },
    {
      href: "/student/professionals",
      icon: "👩‍⚕️",
      label: "Professionals",
    },
    {
      href: "/student/appointments",
      icon: "📅",
      label: "Appointments",
    },
    {
      href: "/student/counselling",
      icon: "💬",
      label: "Counselling",
    },
    {
      href: "/emergency",
      icon: "🚨",
      label: "Emergency Support",
    },
    {
      href: "/student/settings",
      icon: "⚙️",
      label: "Settings",
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    router.replace("/login");
  };

  return (
    <aside
      className="
        hidden lg:flex
        w-64
        min-h-[calc(100vh-64px)]
        bg-white
        border-r border-[#d5ebe8]
        p-5
        flex-col
        sticky top-16
      "
    >
      {/* =====================================================
          LOGO
      ====================================================== */}

      <div className="mb-8 px-2">
        <h1 className="text-2xl font-extrabold text-[#2f7f78]">
          CareBridge
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Student Portal
        </p>
      </div>

      {/* =====================================================
          NAVIGATION
      ====================================================== */}

      <nav className="space-y-1.5 flex-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const isEmergency = link.href === "/emergency";

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`
                flex items-center gap-3
                px-4 py-3
                rounded-xl
                transition-all duration-200

                ${
                  isEmergency
                    ? isActive
                      ? "bg-red-50 text-red-600 font-semibold"
                      : "text-red-500 hover:bg-red-50"
                    : isActive
                    ? "bg-blue-50 text-blue-600 font-semibold shadow-sm"
                    : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                }
              `}
            >
              {/* Icon */}
              <span className="text-lg w-6 text-center">
                {link.icon}
              </span>

              {/* Label */}
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}