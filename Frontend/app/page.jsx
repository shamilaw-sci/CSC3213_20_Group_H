"use client";

import Link from "next/link";

export default function Home() {
    const handleAnonymousLogin = async()=>{
        const response = await fetch(
            "http://localhost:5000/api/auth/anonymous",
            {
                method: "POST"
            }
        );

        const data = await response.json();

        console.log(data);

        if(data.token){
            localStorage.setItem(
                "token",
                data.token
            );

            localStorage.setItem(
                "role",
                data.user.role
            );

            localStorage.setItem(
                "anonymousId",
                data.user.anonymousId
            );

            alert("Anonymous Login Successful");
            window.location.href="/dashboard";
        }else{
            alert(data.message);
        }
    };

    return (
        <div className="home-container">
            <div className="hero">
                <h1>Welcome to CareBridge</h1>
                <p>
                    A safe space for university students to understand their mental health, seek support, and build a healthier future.                
                </p>

                <div className="buttons">
                    <Link href="/register">
                        <button className="register-btn">Register</button>
                    </Link>

                    <Link href="/login">
                        <button className="login-btn">Login</button>
                    </Link>
                </div>

                <button className="anonymous-btn" onClick={handleAnonymousLogin}>Continue as Anonymous</button>
            </div>

        </div>
    );
}