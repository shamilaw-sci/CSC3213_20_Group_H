import { useEffect } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

const VoiceCall = () => {

  useEffect(() => {

    socket.emit("joinRoom", "session-room");

    socket.on("incomingCall", (data) => {
      alert(`Incoming call from ${data.caller}`);
    });

    return () => {
      socket.off("incomingCall");
    };

  }, []);

  const startCall = () => {

    socket.emit("callUser", {
      roomId: "session-room",
      caller: "Client",
    });

    alert("Calling...");
  };

  const endCall = () => {
    alert("Call Ended");
  };

  return (
    <div>
      <h2>Voice Call Counselling</h2>

      <button onClick={startCall}>
        Start Call
      </button>

      <button
        onClick={endCall}
        style={{ marginLeft: "10px" }}
      >
        End Call
      </button>
    </div>
  );
};

export default VoiceCall;