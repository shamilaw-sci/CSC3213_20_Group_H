"use client";

import Link from "next/link";

export default function RecommendedSection() {
  const recommendations = [
    {
      icon: "👩‍⚕️",
      title: "Find a Professional",
      description:
        "Explore available mental health professionals and counsellors.",
      button: "View Professionals",
      href: "/student/professionals",
      style: "border-blue-200 text-blue-600 hover:bg-blue-50",
      iconStyle: "bg-blue-50",
    },
    {
      icon: "💬",
      title: "Counselling Support",
      description:
        "Connect with a counsellor when you need someone to talk to.",
      button: "Get Support",
      href: "/student/counselling",
      style: "border-cyan-200 text-cyan-600 hover:bg-cyan-50",
      iconStyle: "bg-cyan-50",
    },
    {
      icon: "📚",
      title: "Helpful Resources",
      description:
        "Explore wellbeing information and self-help resources.",
      button: "Explore Resources",
      href: "/features",
      style: "border-green-200 text-green-600 hover:bg-green-50",
      iconStyle: "bg-green-50",
    },
  ];

  return (
    <section className="bg-white rounded-2xl border border-blue-100 p-6 shadow-sm mb-8 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-xl font-bold text-gray-800">
            Explore Support
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            Find the right support for you
          </p>
        </div>

        <span className="hidden sm:block text-2xl">
          🌿
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {recommendations.map((item) => (
          <div
            key={item.title}
            className="
              border
              border-gray-100
              rounded-2xl
              p-5
              hover:shadow-md
              hover:border-blue-100
              transition-all
              duration-200
            "
          >
            <div
              className={`w-12 h-12 rounded-xl ${item.iconStyle} flex items-center justify-center text-3xl mb-4`}
            >
              {item.icon}
            </div>

            <h4 className="font-semibold text-gray-800">
              {item.title}
            </h4>

            <p className="text-sm text-gray-500 mt-1">
              {item.description}
            </p>

            <Link
              href={item.href}
              className={`
                inline-block
                mt-4
                px-4
                py-2
                rounded-lg
                border
                transition-all
                duration-200
                font-medium
                ${item.style}
              `}
            >
              {item.button}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}