export default function DashboardStats() {
  const stats = [
    {
      icon: "📝",
      title: "Assessment",
      value: "Completed",
      description: "Latest: PHQ-9",
      color: "blue",
    },
    {
      icon: "😊",
      title: "Wellbeing",
      value: "Stable",
      description: "Keep taking care!",
      color: "green",
    },
    {
      icon: "📅",
      title: "Next Appointment",
      value: "Aug 12",
      description: "10:00 AM",
      color: "cyan",
    },
    {
      icon: "💬",
      title: "Support",
      value: "Available",
      description: "We're here for you",
      color: "teal",
    },
  ];

  const colorStyles: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    cyan: "bg-cyan-50 text-cyan-600",
    teal: "bg-teal-50 text-teal-600",
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className="
            bg-white
            rounded-2xl
            border border-blue-100
            p-6
            shadow-sm
            hover:shadow-md
            hover:-translate-y-0.5
            transition-all duration-200
          "
        >
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 ${
              colorStyles[stat.color]
            }`}
          >
            {stat.icon}
          </div>

          <p className="text-sm text-gray-500">
            {stat.title}
          </p>

          <h3 className="text-xl font-bold text-gray-800 mt-1">
            {stat.value}
          </h3>

          <p className="text-sm text-gray-500 mt-2">
            {stat.description}
          </p>
        </div>
      ))}
    </div>
  );
}