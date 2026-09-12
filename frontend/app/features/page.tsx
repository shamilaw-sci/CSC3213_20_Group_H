import Link from "next/link";
import { Nunito } from "next/font/google";
import { 
  ShieldCheck, 
  Bot, 
  Award, 
  Calendar, 
  PhoneCall, 
  AlertTriangle, 
  LayoutDashboard 
} from "lucide-react";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const features = [
  {
    title: "User Management & Security",
    description: "Secure registration, login with JWT authentication, and Role-Based Access Control (RBAC) ensuring privacy with anonymous access options.",
    icon: <ShieldCheck size={36} className="text-emerald-600" />,
    badge: "Security",
  },
  {
    title: "AI Companion & Severity Prediction",
    description: "Conversational AI interface offering real-time mental health guidance and automated risk severity level categorization (Low, Moderate, High).",
    icon: <Bot size={36} className="text-indigo-600" />,
    badge: "AI Powered",
  },
  {
    title: "Clarity Shard System",
    description: "Gamified behavioral commitments that reward positive mental health habits with 'Clarity Shards' to unlock professional counseling sessions.",
    icon: <Award size={36} className="text-amber-500" />,
    badge: "Gamification",
  },
  {
    title: "Booking & Scheduling",
    description: "Intelligent professional recommendation engine, seamless slot booking, and concurrency control to prevent calendar conflicts.",
    icon: <Calendar size={36} className="text-blue-600" />,
    badge: "Scheduling",
  },
  {
    title: "Voice Call Counselling",
    description: "WebRTC-integrated real-time voice communication allowing students to speak directly and securely with professional counselors.",
    icon: <PhoneCall size={36} className="text-purple-600" />,
    badge: "Live Session",
  },
  {
    title: "Emergency Support Module",
    description: "Instant crisis risk detection workflow that activates emergency alerts, resources, and immediate notifications to counselors.",
    icon: <AlertTriangle size={36} className="text-rose-600" />,
    badge: "Safety First",
  },
  {
    title: "Administrative Dashboard",
    description: "Comprehensive administration interface for monitoring system analytics, managing user accounts, and verifying mental health professionals.",
    icon: <LayoutDashboard size={36} className="text-cyan-600" />,
    badge: "Management",
  },
];

export default function FeaturesPage() {
  return (
    <section id="info" className={`${nunito.className} min-h-screen py-20 px-6 bg-gray-50 flex flex-col items-center`}>
      <div className="max-w-6xl w-full flex flex-col items-center">
        
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
            Platform Features
          </h2>
          <p className="text-lg text-gray-600 mt-3 max-w-2xl">
            Explore the core modules designed to make mental health support accessible, secure, and tailored for every student.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    {feature.icon}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                    {feature.badge}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400">CareBridge Module</span>
                <Link 
                  href="#" 
                  className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  Learn more &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </section>
  );
}