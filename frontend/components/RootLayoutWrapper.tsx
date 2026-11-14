"use client";

import { useEffect, useState } from "react";
import EmergencyButton from "@/components/EmergencyButton";

export default function RootLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    setRole(storedUser.role || localStorage.getItem("role"));
  }, []);

  return (
    <>
      {children}
      {role !== "counsellor" && <EmergencyButton />}
    </>
  );
}
