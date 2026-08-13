"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function ConditionalNavbar() {
  const pathname = usePathname();

  // Don't show the public Navbar inside student pages
  if (pathname.startsWith("/student")) {
    return null;
  }

  return <Navbar />;
}