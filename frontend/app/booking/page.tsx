import AuthGuard from "@/components/AuthGuard";
import AppointmentBooking from "@/components/AppointmentBooking";

export default function BookingPage() {
  return (
    <AuthGuard>
      <AppointmentBooking />
    </AuthGuard>
  );
}