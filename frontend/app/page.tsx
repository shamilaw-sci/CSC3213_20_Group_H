import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-6">
      <h1 className="text-3xl font-bold text-gray-800">CareBridge</h1>
      <p className="text-gray-500">Mental health support for university students</p>

      <div className="flex flex-col gap-3 w-64">
        <Link
          href="/login"
          className="text-center bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
        >
          Login
        </Link>

        <Link
          href="/register"
          className="text-center bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-100 transition"
        >
          Register
        </Link>

        <Link
          href="/anonymous"
          className="text-center text-gray-500 text-sm underline hover:text-gray-700 transition"
        >
          Continue as Anonymous
        </Link>
      </div>
    </div>
  );
}