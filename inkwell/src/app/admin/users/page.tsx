import { PageHeader } from "@/components/admin/ui";
import { UsersManager } from "@/components/admin/users-manager";
import { listUsers } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { hasServiceRole } from "@/lib/env";

export const metadata = { title: "Authors & access" };

export default async function UsersPage() {
  const ctx = await requireAdmin();
  const users = await listUsers(ctx);
  return (
    <>
      <PageHeader title="Authors & access" description="Who can sign in to the dashboard, and what they can do." />
      <UsersManager users={users} currentUserId={ctx.user.id} canCreate={hasServiceRole()} />
    </>
  );
}
