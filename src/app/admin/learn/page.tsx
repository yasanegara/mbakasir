import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import LearnAdminClient from "./LearnAdminClient";

export default async function LearnAdminPage() {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") redirect("/dashboard");

  return (
    <DashboardLayout title="Kelola Konten Learn">
      <LearnAdminClient />
    </DashboardLayout>
  );
}
