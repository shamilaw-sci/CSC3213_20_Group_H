"use client";

import {useState, useEffect} from "react";
import AuthGuard from "../../components/AuthGuard";
import Logout from "../../components/Logout";

export default function Admin(){
    const [message,setMessage]=useState("");

    useEffect(()=>{
        const getAdmindata = async()=>{
            const token = localStorage.getItem("token");

            const response = await fetch(
                "http://localhost:5000/api/user/admin",
                {
                    method:"GET",
                    headers:{
                        Authorization:`Bearer ${token}`
                    }
                }
            );

            const data = await response.json();
            setMessage(data.message);
        };
        getAdmindata();
    }, []);
    
    return(
        <AuthGuard allowedRole="admin">
            <div>
            <h1>Admin Dashboard</h1>
            <h2>{message}</h2>
            <p>Manage users, counsellors and system settings</p>
            <Logout/>
        </div>
        </AuthGuard>
        
    );
}