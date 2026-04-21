import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AnnouncementAdminClient from "./AnnouncementAdminClient";

export default async function AnnouncementsAdminPage() {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") redirect("/dashboard");

  return (
    <DashboardLayout title="Kelola Pengumuman">
      <AnnouncementAdminClient />
    </DashboardLayout>
  );
}
