"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import TenantLockWrapper from "./TenantLockWrapper";

// ============================================================
// MAIN LAYOUT (App Shell)
// ============================================================

export default function DashboardLayout({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar
        isOpen={isSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        onClose={() => setIsSidebarOpen(false)}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      <div className={`main-content${isSidebarCollapsed ? " sidebar-collapsed" : ""}`}>
        <Header
          title={title}
          onMenuClick={() => setIsSidebarOpen((prev) => !prev)}
        />

        <main className="page-body animate-fade-in">
          <TenantLockWrapper>{children}</TenantLockWrapper>
        </main>
      </div>
    </div>
  );
}
