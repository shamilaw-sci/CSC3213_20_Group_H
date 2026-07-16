"use client";

import AuthGuard from "../../components/AuthGuard";
import Logout from "../../components/Logout";

export default function Counsellor(){
    return(
        <AuthGuard allowedRole="counsellor">
            <div>
                <h1>Counsellor Dashboard</h1>
                <p>Welcome Counsellor</p>
                <Logout/>
            </div>
        </AuthGuard>
        
    );
}