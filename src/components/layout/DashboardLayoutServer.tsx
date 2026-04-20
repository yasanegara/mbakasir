import DashboardLayout from "./DashboardLayout";

/**
 * Server wrapper kept for routes that still prefer importing a server component.
 * Brand config is already provided globally by the root layout.
 */
export default function DashboardLayoutServer({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return <DashboardLayout title={title}>{children}</DashboardLayout>;
}
