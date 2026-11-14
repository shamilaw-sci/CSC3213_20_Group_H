import Link from "next/link";

export default function QuickActions() {
  const actions = [
    {
      href: "/student/assessments",
      icon: "📝",
      title: "Take Assessment",
      description: "Check in with yourself",
      style:
        "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 hover:border-blue-200",
    },
    {
      href: "/student/appointments",
      icon: "📅",
      title: "Book Appointment",
      description: "Find a professional",
      style:
        "bg-green-50 text-green-700 border-green-100 hover:bg-green-100 hover:border-green-200",
    },
    {
      href: "/student/counselling",
      icon: "💬",
      title: "Talk to a Counsellor",
      description: "Get support when needed",
      style:
        "bg-cyan-50 text-cyan-700 border-cyan-100 hover:bg-cyan-100 hover:border-cyan-200",
    },
    {
      href: "/emergency",
      icon: "🚨",
      title: "Emergency Support",
      description: "Get immediate help",
      style:
        "bg-red-50 text-red-600 border-red-100 hover:bg-red-100 hover:border-red-200",
    },
  ];

  return (
    <section className="mb-8">
      <h3 className="text-xl font-bold text-gray-800 mb-5">
        Quick Actions
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {actions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className={`
              p-5
              rounded-2xl
              border
              transition-all
              duration-200
              hover:shadow-md
              hover:-translate-y-0.5
              ${action.style}
            `}
          >
            <div className="w-11 h-11 rounded-xl bg-white/70 flex items-center justify-center text-2xl mb-4">
              {action.icon}
            </div>

            <p className="font-semibold">
              {action.title}
            </p>

            <p className="text-sm opacity-75 mt-1">
              {action.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}