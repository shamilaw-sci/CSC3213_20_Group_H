import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-blue-600 text-white px-4 py-2 flex justify-between items-center">
      {/* Logo */}
      <h1 className="font-bold text-xl">CareBridge</h1>

      {/* Navigation Links */}
      <ul className="flex gap-4">
        <li>
          <Link href="/" className="hover:underline">
            Home
          </Link>
        </li>

        <li>
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>
        </li>

        <li>
          <Link href="/availability" className="hover:underline">
            Availability
          </Link>
        </li>

        <li>
          <Link href="/booking" className="hover:underline">
            Booking
          </Link>
        </li>

        <li>
          <Link href="/session-history" className="hover:underline">
            Sessions
          </Link>
        </li>

        <li>
          <Link href="/voice-call" className="hover:underline">
            Voice Call
          </Link>
        </li>

        <li>
          <Link href="/login" className="hover:underline">
            Login
          </Link>
        </li>

        <li>
          <Link href="/register" className="hover:underline">
            Register
          </Link>
        </li>

        <li>
          <Link href="/emergency" className="hover:underline text-red-200 font-semibold">
            🚨 Emergency
          </Link>
        </li>
      </ul>
    </nav>
  );
}