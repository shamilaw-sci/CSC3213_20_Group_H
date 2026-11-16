
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import socket from "@/services/socket";
import { API_BASE_URL } from "@/services/api";

export default function VoiceCall() {
  const searchParams = useSearchParams();

  const roomId = searchParams.get("room");
  const emergencyId = searchParams.get("emergencyId");

  const [status, setStatus] = useState("Waiting for connection");
  const [isCallStarted, setIsCallStarted] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const isMountedRef = useRef(true);

  const createPeerConnection = useCallback(async () => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        "Microphone access is unavailable. Use localhost or HTTPS."
      );
    }

    setStatus("Requesting microphone permission...");

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    localStreamRef.current = stream;

    const peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    });

    stream.getTracks().forEach((track) => {
      peer.addTrack(track, stream);
    });

    peer.ontrack = async (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];

        try {
          await remoteAudioRef.current.play();
        } catch (error) {
          console.error("Remote audio playback failed:", error);
          setStatus("Connected, but audio playback needs permission");
        }
      }
    };

    peer.onicecandidate = (event) => {
      if (event.candidate && roomId) {
        socket.emit("ice-candidate", {
          roomId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    peer.onconnectionstatechange = () => {
      console.log("WebRTC connection state:", peer.connectionState);

      if (!isMountedRef.current) return;

      switch (peer.connectionState) {
        case "connected":
          setStatus("Connected");
          break;
        case "connecting":
          setStatus("Connecting...");
          break;
        case "disconnected":
          setStatus("Connection interrupted");
          break;
        case "failed":
          setStatus("Connection failed");
          break;
        case "closed":
          setStatus("Call ended");
          break;
        default:
          setStatus("Waiting for connection");
      }
    };

    peerConnectionRef.current = peer;

    return peer;
  }, [roomId]);

  // Join the same room in both browsers and register signalling listeners.
  useEffect(() => {
    isMountedRef.current = true;

    if (!roomId) {
      setStatus("Missing room ID");
      return;
    }

    const joinRoom = () => {
      console.log("Joining voice call room:", roomId);
      socket.emit("join-room", roomId);
    };

    if (socket.connected) {
      joinRoom();
    }

    socket.on("connect", joinRoom);

    const handleOffer = async (offer: RTCSessionDescriptionInit) => {
      try {
        console.log("Received WebRTC offer");

        const peer = await createPeerConnection();

        await peer.setRemoteDescription(
          new RTCSessionDescription(offer)
        );

        // Add any ICE candidates that arrived before the offer.
        for (const candidate of pendingCandidatesRef.current) {
          await peer.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        }
        pendingCandidatesRef.current = [];

        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        socket.emit("answer", {
          roomId,
          answer: peer.localDescription,
        });

        setStatus("Answer sent. Connecting...");
      } catch (error) {
        console.error("Error handling WebRTC offer:", error);
        setStatus("Could not answer the call");
      }
    };

    const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
      try {
        const peer = peerConnectionRef.current;

        if (!peer) {
          console.error("Received answer without a peer connection");
          return;
        }

        await peer.setRemoteDescription(
          new RTCSessionDescription(answer)
        );

        // Add any ICE candidates that arrived before the answer.
        for (const candidate of pendingCandidatesRef.current) {
          await peer.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        }
        pendingCandidatesRef.current = [];

        setStatus("Answer received. Connecting...");
      } catch (error) {
        console.error("Error handling WebRTC answer:", error);
      }
    };

    const handleIceCandidate = async (
      candidate: RTCIceCandidateInit
    ) => {
      try {
        const peer = peerConnectionRef.current;

        if (!peer || !peer.remoteDescription) {
          pendingCandidatesRef.current.push(candidate);
          return;
        }

        await peer.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    };

    const handleCallEnded = () => {
      setStatus("Call ended");
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
      localStreamRef.current = null;
      setIsCallStarted(false);
    };

    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("callEnded", handleCallEnded);

    return () => {
      isMountedRef.current = false;

      socket.off("connect", joinRoom);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("callEnded", handleCallEnded);

      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      peerConnectionRef.current?.close();

      peerConnectionRef.current = null;
      localStreamRef.current = null;
      pendingCandidatesRef.current = [];
    };
  }, [roomId, createPeerConnection]);

  // The counsellor clicks Start Call. The student answers automatically.
  const startCall = async () => {
    try {
      if (!roomId) {
        setStatus("Missing room ID");
        return;
      }

      if (!socket.connected) {
        setStatus("Connecting to call server...");
        return;
      }

      setIsCallStarted(true);
      setStatus("Starting call...");

      const peer = await createPeerConnection();

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      socket.emit("offer", {
        roomId,
        offer: peer.localDescription,
      });

      setStatus("Calling student...");
    } catch (error) {
      console.error("Could not start call:", error);
      setStatus("Failed to start call");
      setIsCallStarted(false);
    }
  };

  const endCall = async () => {
    try {
      localStreamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      peerConnectionRef.current?.close();
      peerConnectionRef.current = null;
      localStreamRef.current = null;
      pendingCandidatesRef.current = [];

      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
      }

      socket.emit("endCall", { roomId });

      setStatus("Call ended");
      setIsCallStarted(false);

      if (emergencyId) {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `${API_BASE_URL}/api/emergency/${emergencyId}/complete`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token || ""}`,
            },
          }
        );

        if (!response.ok) {
          console.error(
            "Could not mark emergency as completed:",
            await response.text()
          );
        }
      }
    } catch (error) {
      console.error("Error ending call:", error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-8">
      <h1 className="text-3xl font-bold mb-4">
        Voice Counselling
      </h1>

      <div className="mb-4">
        <p className="text-gray-600 break-all">
          Room: <span className="font-semibold">{roomId || "Not provided"}</span>
        </p>

        <p className="text-gray-600">
          Emergency ID:{" "}
          <span className="font-semibold">{emergencyId || "Not provided"}</span>
        </p>
      </div>

      <div className="mb-6">
        <span className="font-semibold">Status:</span>{" "}
        <span>{status}</span>
      </div>

      <div className="flex gap-4 mb-8">
        <button
          onClick={startCall}
          disabled={isCallStarted}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl"
        >
          Start Call
        </button>

        <button
          onClick={endCall}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl"
        >
          End Call
        </button>
      </div>

      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
      />
    </div>
  );
}
