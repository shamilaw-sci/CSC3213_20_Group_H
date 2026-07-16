"use client";

export default function Logout(){
    const logout =()=>{
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        window.location.href="/login";
    }
    return(
        <button className="logout-btn" onClick={logout}>Logout</button>
    );
}