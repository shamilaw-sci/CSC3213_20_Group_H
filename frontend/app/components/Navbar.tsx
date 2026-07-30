export default function Navbar() {
  return (
    <nav className="bg-blue-600 text-white px-4 py-2 flex justify-between items-center">
      <h1 className="font-bold">CareBridge</h1>
      <ul className="flex gap-4">
        <li><a href="/">Home</a></li>
        <li><a href="/dashboard">Dashboard</a></li>
        <li><a href="/login">Login</a></li>
        <li><a href="/register">Register</a></li>
        <li><a href="/emergency">🚨 Emergency</a></li>
        {/* Add booking link */}
      </ul>
    </nav>
  );
}
