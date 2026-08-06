import AuthGuard from "@/components/AuthGuard";
import SessionHistory from "@/components/SessionHistory";

export default function SessionHistoryPage() {
  return (
    <AuthGuard>
      <SessionHistory />
    </AuthGuard>
  );
}