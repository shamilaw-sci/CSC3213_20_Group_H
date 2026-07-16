"use client";

import {useState} from "react";

export default function Login(){
    const[email,setEmail] = useState("");
    const[password,setPassword] = useState("");

    const handleLogin = async()=>{
        const response = await fetch(
            "http://localhost:5000/api/auth/login",
            {
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({
                    email,
                    password
                })
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

    alert("Login Successful");

    if(data.user.role === "admin"){
        window.location.href="/admin";
    }
    else if(data.user.role === "counsellor"){
        window.location.href="/counsellor";
    }
    else{
        window.location.href="/student";
    }
}else{ 
            alert(data.message);

}
    };

    return(
        <div className="container">
            <h1>Login</h1>

            <label htmlFor="Email">Email: </label><br/>
            <input placeholder="Email"
            onChange={(e)=>setEmail(e.target.value)}/><br/><br/>

            <label htmlFor="Password">Password: </label><br/>
            <input placeholder="Password"
            type="password"
            onChange={(e)=>setPassword(e.target.value)}/><br/><br/><br/><br/>

            <button onClick={handleLogin}>Login</button>           
        </div>
    )
}