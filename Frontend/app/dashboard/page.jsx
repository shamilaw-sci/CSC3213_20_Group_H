"use client";

import { useEffect, useState } from "react";
import Logout from "../../components/Logout";

export default function Dashboard() {
    const [message, setMessage] = useState("");
    const [userId, setUserId] = useState("");

    useEffect(()=>{
        const getProfile = async()=>{
            const token = localStorage.getItem("token");

            const response = await fetch(
                "http://localhost:5000/api/user/profile",
                {
                    method:"GET",
                    headers:{Authorization:`Bearer ${token}`}
                }
            );

            const data = await response.json();
            console.log(data);

            setMessage(data.message);
            setUserId(data.userId);
        };
        getProfile();
    },[]);

    return(
        <div>
            <h1>CareBridge Dashboard</h1>
            <h2>{message}</h2>
            <p>User ID: {userId}</p>
            <Logout/>
        </div>
    );

}