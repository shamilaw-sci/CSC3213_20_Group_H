"use client";

import { useEffect, useState } from "react";
import socket from "@/services/socket";

const VoiceCall = () => {
  const [callStatus, setCallStatus] = useState("Disconnected");

  useEffect(() => {
    socket.emit("joinRoom", "session-room");

    socket.on("incomingCall", (data) => {
      setCallStatus(`Incoming call from ${data.caller}`);
      alert(`Incoming call from ${data.caller}`);
    });

    socket.on("callEnded", () => {
      setCallStatus("Call Ended");
    });

    return () => {
      socket.off("incomingCall");
      socket.off("callEnded");
    };
  }, []);

  const startCall = () => {
    socket.emit("callUser", {
      roomId: "session-room",
      caller: "Client",
    });

    setCallStatus("Calling...");
  };

  const endCall = () => {
    socket.emit("endCall", {
      roomId: "session-room",
    });

    setCallStatus("Call Ended");
  };

  return (
    <div
      style={{
        padding: "20px",
        border: "1px solid #ddd",
        borderRadius: "10px",
      }}
    >
      <h2>Voice Call Counselling</h2>

      <p>
        <strong>Status:</strong> {callStatus}
      </p>

      <button
        onClick={startCall}
        style={{
          padding: "10px 20px",
          marginRight: "10px",
          cursor: "pointer",
        }}
      >
        Start Call
      </button>

      <button
        onClick={endCall}
        style={{
          padding: "10px 20px",
          cursor: "pointer",
        }}
      >
        End Call
      </button>
    </div>
  );
};

export default VoiceCall;