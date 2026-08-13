"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function GoogleCallback() {

  const router = useRouter();
  const searchParams = useSearchParams();


  useEffect(() => {

    const token = searchParams.get("token");
    const userId = searchParams.get("userId");
    const role = searchParams.get("role");


    if(token && userId && role){

      localStorage.setItem("token", token);

      localStorage.setItem(
        "user",
        JSON.stringify({
          id: userId,
          role: role.toLowerCase()
        })
      );


      router.replace("/student/dashboard");

    }
    else{
      router.replace("/login");
    }


  }, []);


  return (
    <p>
      Completing Google Login...
    </p>
  );
}