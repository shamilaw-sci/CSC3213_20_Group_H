import { Nunito } from "next/font/google";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export default function Navbar() {
  return (
    <nav className={`${nunito.className} p-4 px-10 flex justify-between items-center`}>
      <h1 className="font-bold text-2xl"><a href="/">CareBridge</a></h1>
      <ul className="flex gap-4 font-bold">
        <li><a href="/features">Features</a></li>
        <li><a href="/how-it-works">How it works</a></li>
        <li><a href="/about">About</a></li>
        <li><a href="/contact">Contact</a></li>
        <li><a href="/login">Login</a></li>
        <li><a href="/register">Sign up</a></li>
      </ul>
    </nav>
  );
}