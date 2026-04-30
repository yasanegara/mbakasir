"use client";

import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import TenantLockWrapper from "./TenantLockWrapper";
import PullToRefresh from "@/components/common/PullToRefresh";
import SetupWizardModal from "@/components/dashboard/SetupWizardModal";

// ============================================================
// MAIN LAYOUT (App Shell)
// ============================================================

export default function DashboardLayout({
  children,
  title,
  headerActions,
}: {
  children: React.ReactNode;
  title?: string;
  headerActions?: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Persistence to avoid flicking on transitions since layout is used per-page
  useEffect(() => {
    const saved = localStorage.getItem("mbakasir_sidebar_collapsed");
    if (saved === "true") setIsSidebarCollapsed(true);
  }, []);

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const newVal = !prev;
      localStorage.setItem("mbakasir_sidebar_collapsed", String(newVal));
      return newVal;
    });
  };

  return (
    <div className="app-shell">
      <Sidebar
        isOpen={isSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        onClose={() => setIsSidebarOpen(false)}
        onToggleCollapse={handleToggleCollapse}
      />

      <SetupWizardModal />

      <div className={`main-content${isSidebarCollapsed ? " sidebar-collapsed" : ""}`}>
        <Header
          title={title}
          onMenuClick={() => setIsSidebarOpen((prev) => !prev)}
          headerActions={headerActions}
        />

        <main className="page-body">
          <PullToRefresh onRefresh={async () => { window.location.reload(); }}>
            <TenantLockWrapper>{children}</TenantLockWrapper>
          </PullToRefresh>
        </main>
      </div>
    </div>
  );
}
