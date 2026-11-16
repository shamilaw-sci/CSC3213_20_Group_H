"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleGenAI, Modality } from "@google/genai";
import {
  Mic,
  MicOff,
  PhoneOff,
  RefreshCw,
  Volume2,
  VolumeX,
  Hand,
  Radio,
} from "lucide-react";
import api from "@/services/api";
import {
  ChatMessage,
  CrisisResources,
  RiskAssessmentSummary,
} from "@/types/ChatMessage";

type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

interface GeminiLiveVoiceProps {
  conversationId: number | null;
  onTurnPersisted: (payload: {
    conversationId: number;
    messages: ChatMessage[];
    riskAssessment?: RiskAssessmentSummary;
    crisisResources?: CrisisResources | null;
    crisisDetected?: boolean;
  }) => void;
  onClose?: () => void;
}

function float32ToPcm16Base64(float32: Float32Array): string {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64Pcm16ToFloat32(base64: string): Float32Array<ArrayBuffer> {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer);
  const sampleCount = Math.floor(len / 2);
  const float32 = new Float32Array(new ArrayBuffer(sampleCount * 4));
  for (let i = 0; i < sampleCount; i += 1) {
    float32[i] = view.getInt16(i * 2, true) / 0x8000;
  }
  return float32;
}

export default function GeminiLiveVoice({
  conversationId,
  onTurnPersisted,
  onClose,
}: GeminiLiveVoiceProps) {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [micActive, setMicActive] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [liveUserTranscript, setLiveUserTranscript] = useState("");
  const [liveBotTranscript, setLiveBotTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const nextPlaybackTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const userTranscriptBufRef = useRef<string>("");
  const botTranscriptBufRef = useRef<string>("");
  const activeConversationIdRef = useRef<number | null>(conversationId);
  const micMutedRef = useRef<boolean>(false);
  const speakerMutedRef = useRef<boolean>(false);
  const manualStopRef = useRef<boolean>(false);

  useEffect(() => {
    activeConversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    micMutedRef.current = micMuted;
  }, [micMuted]);

  useEffect(() => {
    speakerMutedRef.current = speakerMuted;
  }, [speakerMuted]);

  const stopPlayback = useCallback(() => {
    activeSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        // already stopped
      }
    });
    activeSourcesRef.current.clear();
    if (playbackCtxRef.current) {
      nextPlaybackTimeRef.current = playbackCtxRef.current.currentTime;
    }
    setAiSpeaking(false);
  }, []);

  const cleanupAudioAndSession = useCallback(() => {
    stopPlayback();

    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {
        // ignore
      }
      processorRef.current = null;
    }
    if (captureCtxRef.current) {
      captureCtxRef.current.close().catch(() => {});
      captureCtxRef.current = null;
    }
    if (playbackCtxRef.current) {
      playbackCtxRef.current.close().catch(() => {});
      playbackCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch {
        // ignore
      }
      sessionRef.current = null;
    }
    setMicActive(false);
    setAiSpeaking(false);
  }, [stopPlayback]);

  useEffect(() => {
    return () => {
      manualStopRef.current = true;
      cleanupAudioAndSession();
    };
  }, [cleanupAudioAndSession]);

  const flushTurnToBackend = useCallback(async () => {
    const userText = userTranscriptBufRef.current.trim();
    const botText = botTranscriptBufRef.current.trim();
    userTranscriptBufRef.current = "";
    botTranscriptBufRef.current = "";
    setLiveUserTranscript("");
    setLiveBotTranscript("");

    if (!userText) return;

    try {
      const res = await api.post("/voice/turn", {
        conversationId: activeConversationIdRef.current,
        userTranscript: userText,
        assistantTranscript: botText || undefined,
      });
      if (res.data?.conversationId) {
        activeConversationIdRef.current = res.data.conversationId;
      }
      onTurnPersisted(res.data);

      // If deterministic safety rules detected high risk, interrupt audio immediately
      if (res.data?.crisisDetected) {
        stopPlayback();
      }
    } catch (err) {
      console.error("Failed to persist voice turn through safety pipeline:", err);
    }
  }, [onTurnPersisted, stopPlayback]);

  const enqueueAudioChunk = useCallback(
    (base64Audio: string) => {
      if (speakerMutedRef.current) return;
      try {
        if (!playbackCtxRef.current) {
          playbackCtxRef.current = new AudioContext({ sampleRate: 24000 });
          nextPlaybackTimeRef.current = playbackCtxRef.current.currentTime;
        }
        const ctx = playbackCtxRef.current;
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }
        const float32 = base64Pcm16ToFloat32(base64Audio);
        const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
        audioBuffer.copyToChannel(float32, 0);

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);

        const startAt = Math.max(ctx.currentTime, nextPlaybackTimeRef.current);
        source.start(startAt);
        nextPlaybackTimeRef.current = startAt + audioBuffer.duration;
        activeSourcesRef.current.add(source);
        setAiSpeaking(true);

        source.onended = () => {
          activeSourcesRef.current.delete(source);
          if (activeSourcesRef.current.size === 0) {
            setAiSpeaking(false);
          }
        };
      } catch (err) {
        console.error("Audio playback error:", err);
        setErrorMessage("Audio playback error occurred in your browser.");
      }
    },
    []
  );

  const startVoiceSession = async () => {
    manualStopRef.current = false;
    setErrorMessage("");
    setConnectionState("connecting");

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone access is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const sessionRes = await api.post("/voice/session", {
        conversationId: activeConversationIdRef.current,
      });

      const { token, model, conversationId: resolvedConvId } = sessionRes.data;
      if (resolvedConvId) {
        activeConversationIdRef.current = resolvedConvId;
      }

      const ai = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: "v1alpha" },
      });

      const liveSession = await ai.live.connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setConnectionState("connected");
          },
          onmessage: (msg: any) => {
            const serverContent = msg?.serverContent;
            if (!serverContent) return;

            if (serverContent.interrupted) {
              stopPlayback();
            }

            const inText = serverContent.inputTranscription?.text;
            if (inText) {
              userTranscriptBufRef.current += inText;
              setLiveUserTranscript(userTranscriptBufRef.current);
            }

            const outText = serverContent.outputTranscription?.text;
            if (outText) {
              botTranscriptBufRef.current += outText;
              setLiveBotTranscript(botTranscriptBufRef.current);
            }

            const parts = serverContent.modelTurn?.parts || [];
            for (const part of parts) {
              if (part?.inlineData?.data) {
                enqueueAudioChunk(part.inlineData.data);
              } else if (part?.text && !outText) {
                botTranscriptBufRef.current += part.text;
                setLiveBotTranscript(botTranscriptBufRef.current);
              }
            }

            if (serverContent.turnComplete) {
              flushTurnToBackend();
            }
          },
          onerror: (err: any) => {
            console.error("Gemini Live error:", err);
            setErrorMessage(
              "Voice connection encountered an error. You can reconnect or continue typing below."
            );
            setConnectionState("error");
          },
          onclose: () => {
            if (!manualStopRef.current) {
              setConnectionState("disconnected");
              setMicActive(false);
            }
          },
        },
      });

      sessionRef.current = liveSession;

      const captureCtx = new AudioContext({ sampleRate: 16000 });
      captureCtxRef.current = captureCtx;
      const source = captureCtx.createMediaStreamSource(stream);
      const processor = captureCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        if (micMutedRef.current || !sessionRef.current) return;
        const input = event.inputBuffer.getChannelData(0);
        const base64Pcm = float32ToPcm16Base64(input);
        try {
          sessionRef.current.sendRealtimeInput({
            media: {
              data: base64Pcm,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } catch {
          // ignore send errors during teardown
        }
      };

      source.connect(processor);
      processor.connect(captureCtx.destination);
      setMicActive(true);
      setConnectionState("connected");
    } catch (err: any) {
      console.warn("Failed to start Gemini Live voice session:", err);
      cleanupAudioAndSession();
      setConnectionState("error");
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setErrorMessage(
          "Microphone permission was denied. Please allow microphone access in your browser settings to use voice."
        );
      } else {
        setErrorMessage(
          err?.response?.data?.error ||
            err?.message ||
            "Could not connect to real-time voice service. You can continue using text chat."
        );
      }
    }
  };

  const endVoiceSession = async () => {
    manualStopRef.current = true;
    await flushTurnToBackend();
    cleanupAudioAndSession();
    setConnectionState("disconnected");
  };

  const handleInterrupt = () => {
    stopPlayback();
    if (sessionRef.current) {
      try {
        sessionRef.current.sendClientContent({
          turns: [{ role: "user", parts: [{ text: "[User interrupted]" }] }],
          turnComplete: false,
        });
      } catch {
        // ignore if unsupported
      }
    }
  };

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Radio
            size={18}
            className={
              connectionState === "connected"
                ? "text-emerald-600 animate-pulse"
                : "text-blue-600"
            }
          />
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Real-Time Voice Support (Gemini Live)
            </h3>
            <p className="text-xs text-gray-600">
              Status:{" "}
              <span className="font-semibold capitalize">{connectionState}</span>
              {micActive && !micMuted ? " • Microphone listening" : ""}
              {aiSpeaking ? " • Companion speaking" : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {connectionState !== "connected" && connectionState !== "connecting" ? (
            <button
              type="button"
              onClick={startVoiceSession}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Mic size={14} />
              {connectionState === "error" ? "Reconnect Voice" : "Start Voice Chat"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setMicMuted((prev) => !prev)}
                className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold border ${
                  micMuted
                    ? "bg-amber-100 border-amber-300 text-amber-900"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100"
                }`}
              >
                {micMuted ? <MicOff size={14} /> : <Mic size={14} />}
                {micMuted ? "Unmute Mic" : "Mute Mic"}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!speakerMuted) stopPlayback();
                  setSpeakerMuted((prev) => !prev);
                }}
                className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold border ${
                  speakerMuted
                    ? "bg-amber-100 border-amber-300 text-amber-900"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100"
                }`}
              >
                {speakerMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                {speakerMuted ? "Unmute Audio" : "Mute Audio"}
              </button>

              {aiSpeaking && (
                <button
                  type="button"
                  onClick={handleInterrupt}
                  className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600"
                >
                  <Hand size={14} />
                  Interrupt
                </button>
              )}

              <button
                type="button"
                onClick={endVoiceSession}
                className="inline-flex items-center gap-1 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                <PhoneOff size={14} />
                End Voice
              </button>
            </>
          )}

          {onClose && connectionState !== "connected" && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-2.5 py-2 text-xs font-semibold text-gray-600 hover:bg-white"
            >
              Hide
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={startVoiceSession}
            className="inline-flex items-center gap-1 font-semibold underline shrink-0"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      )}

      {(liveUserTranscript || liveBotTranscript) && (
        <div className="rounded-xl bg-white border border-blue-100 p-3 space-y-1.5 text-xs">
          {liveUserTranscript && (
            <p className="text-blue-900">
              <strong className="font-semibold">You (live):</strong> {liveUserTranscript}
            </p>
          )}
          {liveBotTranscript && (
            <p className="text-gray-800">
              <strong className="font-semibold">Companion (live):</strong> {liveBotTranscript}
            </p>
          )}
        </div>
      )}

      <p className="text-[11px] text-gray-500">
        Voice transcripts are saved to your conversation history and screened with the exact same
        safety checks as text chat.
      </p>
    </div>
  );
}
