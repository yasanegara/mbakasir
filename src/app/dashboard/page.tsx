"use client";

import { useAuth } from "@/contexts/AppProviders";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="skeleton" style={{ height: "150px", width: "100%" }} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      <div style={{ display: "grid", gap: "24px" }}>
        <div className="card">
          <h2>Selamat datang, {user?.name}!</h2>
          <p style={{ color: "hsl(var(--text-secondary))", marginTop: "8px" }}>
            Anda login sebagai <strong>{user?.role}</strong>.
          </p>
        </div>

        {user?.role === "AGENT" && (
          <div className="stat-card">
            <span style={{ fontSize: "14px", color: "hsl(var(--text-secondary))", fontWeight: 600 }}>
              Sisa Token Anda
            </span>
            <span className="stat-value">24</span>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
