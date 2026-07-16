"use client";

import {useState} from "react";

export default function Register(){
    const [name,setName]=useState("");
    const [email,setEmail]=useState("");
    const [password,setPassword]=useState("");

    const handleRegister = async()=>{
        const response = await fetch(
            "http://localhost:5000/api/auth/register",
            {
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({
                name,
                email,
                password
            })
            }
            
        );

        const data =await response.json();
        console.log(data);
        alert(data.message);
    };

    return(
        <div className="container">
            <h1>Register</h1>

            <label htmlFor="Name">Name: </label><br/>
            <input placeholder="Name"
            onChange={(e)=>setName(e.target.value)}
            /><br/><br/>
            
            <label htmlFor="Email">Email: </label><br/>
            <input placeholder="Email"
            onChange={(e)=>setEmail(e.target.value)}
            /><br/><br/>

            <label htmlFor="Password">Password: </label><br/>
            <input placeholder="Password"
            onChange={(e)=>setPassword(e.target.value)}
            /><br/><br/><br/><br/>

            <button onClick={handleRegister}>Register</button>
        </div>
    )

}