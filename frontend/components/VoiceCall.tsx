"use client";

import { useEffect, useRef, useState } from "react";
import socket from "@/services/socket";

export default function VoiceCall() {
  const [status, setStatus] = useState("Disconnected");

  const peerConnectionRef =
    useRef<RTCPeerConnection | null>(null);

  const localStreamRef =
    useRef<MediaStream | null>(null);

  const remoteAudioRef =
    useRef<HTMLAudioElement>(null);

  const roomId = "session-room";

  useEffect(() => {
    socket.emit("join-room", roomId);

    socket.on("offer", async (offer) => {
      try {
        await createPeerConnection();

        await peerConnectionRef.current?.setRemoteDescription(
          new RTCSessionDescription(offer)
        );

        const answer =
          await peerConnectionRef.current?.createAnswer();

        await peerConnectionRef.current?.setLocalDescription(
          answer!
        );

        socket.emit("answer", {
          roomId,
          answer,
        });

        setStatus("Connected");
      } catch (error) {
        console.error(error);
      }
    });

    socket.on("answer", async (answer) => {
      try {
        await peerConnectionRef.current?.setRemoteDescription(
          new RTCSessionDescription(answer)
        );

        setStatus("Connected");
      } catch (error) {
        console.error(error);
      }
    });

    socket.on(
      "ice-candidate",
      async (candidate) => {
        try {
          if (
            peerConnectionRef.current &&
            candidate
          ) {
            await peerConnectionRef.current.addIceCandidate(
              new RTCIceCandidate(
                candidate
              )
            );
          }
        } catch (error) {
          console.error(error);
        }
      }
    );

    return () => {
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
    };
  }, []);

  const createPeerConnection =
    async () => {
      if (peerConnectionRef.current)
        return;

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
          }
        );

      localStreamRef.current = stream;

      const peer =
        new RTCPeerConnection({
          iceServers: [
            {
              urls:
                "stun:stun.l.google.com:19302",
            },
          ],
        });

      stream
        .getTracks()
        .forEach((track) => {
          peer.addTrack(
            track,
            stream
          );
        });

      peer.ontrack = (event) => {
        if (
          remoteAudioRef.current
        ) {
          remoteAudioRef.current.srcObject =
            event.streams[0];
        }
      };

      peer.onicecandidate = (
        event
      ) => {
        if (event.candidate) {
          socket.emit(
            "ice-candidate",
            {
              roomId,
              candidate:
                event.candidate,
            }
          );
        }
      };

      peerConnectionRef.current =
        peer;
    };

  const startCall = async () => {
    try {
      setStatus("Calling...");

      await createPeerConnection();

      const offer =
        await peerConnectionRef.current?.createOffer();

      await peerConnectionRef.current?.setLocalDescription(
        offer!
      );

      socket.emit("offer", {
        roomId,
        offer,
      });
    } catch (error) {
      console.error(error);

      setStatus(
        "Failed to start call"
      );
    }
  };

  const endCall = () => {
    localStreamRef.current
      ?.getTracks()
      .forEach((track) =>
        track.stop()
      );

    peerConnectionRef.current?.close();

    peerConnectionRef.current =
      null;

    setStatus("Disconnected");

    socket.emit("endCall", {
      roomId,
    });
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-8">
      <h1 className="text-3xl font-bold mb-6">
        Voice Counselling
      </h1>

      <div className="mb-6">
        <span className="font-semibold">
          Status:
        </span>{" "}
        {status}
      </div>

      <div className="flex gap-4 mb-8">
        <button
          onClick={startCall}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl"
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
      />
    </div>
  );
}