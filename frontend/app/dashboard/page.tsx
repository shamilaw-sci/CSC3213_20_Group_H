"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "../lib/api";

export default function Dashboard() {
  const [data, setData] = useState("");
  const router = useRouter();

  const logout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/dashboard");
        setData(res.data.message);
      } catch (err) {
        localStorage.removeItem("token");
        router.push("/login"); // redirect unauthorized
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <p>{data}</p>

      <button onClick={logout}>Logout</button>
    </div>
  );
}