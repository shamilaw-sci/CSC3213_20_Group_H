import AuthGuard from "@/components/AuthGuard";
import ClinicalPatientDetail from "@/components/ClinicalPatientDetail";

export default async function ClinicalPatientPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;

  return (
    <AuthGuard allowedRoles={["admin", "supervisor", "counsellor"]}>
      <ClinicalPatientDetail patientId={patientId} />
    </AuthGuard>
  );
}
