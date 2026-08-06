import AuthGuard from "@/components/AuthGuard";
import VoiceCall from "@/components/VoiceCall";

export default function VoiceCallPage() {
  return (
    <AuthGuard>
      <VoiceCall />
    </AuthGuard>
  );
}