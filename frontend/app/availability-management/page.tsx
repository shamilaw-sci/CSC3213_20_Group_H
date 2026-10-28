import AuthGuard from "@/components/AuthGuard";
import AvailabilityForm from "@/components/AvailabilityForm";

export default function AvailabilityManagementPage() {
  return (
    <AuthGuard>
      <AvailabilityForm />
    </AuthGuard>
  );
}