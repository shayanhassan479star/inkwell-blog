import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { getBadgeCounts } from "@/lib/admin";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · Dashboard" },
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = "force-dynamic";

/**
 * Every /admin page renders inside this layout. requireStaff() verifies the Supabase session and the
 * profile role on the server for each request — the middleware redirect is only a convenience.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireStaff();
  const badges = await getBadgeCounts(ctx);
  return (
    <AdminShell name={ctx.profile.display_name} role={ctx.profile.role as "admin" | "author"} badges={badges}>
      {children}
    </AdminShell>
  );
}
