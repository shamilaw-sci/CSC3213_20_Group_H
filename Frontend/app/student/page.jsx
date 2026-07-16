"use client";
import AuthGuard from "../../components/AuthGuard";
import Logout from "../../components/Logout";

export default function Student(){
    return(
        <div>
            <h1>Student Dashboard</h1>
            <p>Welcome Student</p>
            <Logout/>
        </div>
    )
}