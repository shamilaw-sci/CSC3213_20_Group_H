import AuthGuard from "@/components/AuthGuard";
import AvailabilityForm from "@/components/AvailabilityForm";

export default function AvailabilityPage() {
  return (
    <AuthGuard>
      <AvailabilityForm />
    </AuthGuard>
  );
}