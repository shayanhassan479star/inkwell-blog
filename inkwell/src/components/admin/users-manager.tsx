"use client";

import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useConfirm } from "@/components/ui/confirm";
import { Alert, Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { createUser, updateUserAccess } from "@/lib/actions/users";
import type { UserRow } from "@/lib/admin";
import { formatDate } from "@/lib/format";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROLE_HELP: Record<Role, string> = {
  admin: "Full access: all posts, taxonomy, moderation, authors and settings.",
  author: "Can write, edit, publish and delete their own posts and use the AI tools.",
  reader: "No dashboard access.",
};

export function UsersManager({ users, currentUserId, canCreate }: { users: UserRow[]; currentUserId: string; canCreate: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ email: "", displayName: "", password: "", role: "author" as "author" | "admin" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await createUser(form);
      if (res.ok) {
        toast(res.message ?? "Account created.", "success");
        setForm({ email: "", displayName: "", password: "", role: "author" });
        setErrors({});
        router.refresh();
      } else {
        setErrors(res.fieldErrors ?? {});
        toast(res.error, "error");
      }
    });
  };

  const change = async (u: UserRow, patch: { role?: Role; isActive?: boolean }) => {
    const demoting = patch.role && patch.role !== u.role;
    const ok = await confirm({
      title: patch.isActive === false ? `Deactivate ${u.display_name}?` : patch.isActive === true ? `Reactivate ${u.display_name}?` : `Make ${u.display_name} ${patch.role === "admin" ? "an administrator" : patch.role === "author" ? "an author" : "a reader"}?`,
      description: patch.isActive === false ? "They are signed out of the dashboard on their next request and can no longer write. Their published posts stay online." : patch.role === "admin" ? "Administrators can manage every post, all readers' data and other accounts." : demoting ? "Their dashboard access changes immediately." : undefined,
      confirmLabel: "Confirm",
      destructive: patch.isActive === false || (demoting && u.role === "admin"),
    });
    if (!ok) return;
    start(async () => {
      const res = await updateUserAccess(u.id, patch);
      if (res.ok) { toast(res.message ?? "Updated.", "success"); router.refresh(); }
      else toast(res.error, "error");
    });
  };

  return (
    <div className="space-y-8">
      {canCreate ? (
        <section className="card p-6" aria-labelledby="new-user-h">
          <h2 id="new-user-h" className="text-xl font-semibold">Add a writer</h2>
          <p className="mb-5 mt-1 text-sm text-muted-foreground">Creates a confirmed account with the password you set. Share it over a secure channel and ask them to change it under “My profile”.</p>
          <form onSubmit={create} className="grid gap-4 sm:grid-cols-2" noValidate>
            <div>
              <label htmlFor="u-name" className="label">Display name</label>
              <input id="u-name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} className="input" maxLength={80} required aria-invalid={Boolean(errors.displayName)} />
              {errors.displayName && <p className="field-error" role="alert">{errors.displayName}</p>}
            </div>
            <div>
              <label htmlFor="u-email" className="label">Email</label>
              <input id="u-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" autoComplete="off" required aria-invalid={Boolean(errors.email)} />
              {errors.email && <p className="field-error" role="alert">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="u-pass" className="label">Temporary password</label>
              <input id="u-pass" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input" autoComplete="new-password" minLength={12} required aria-invalid={Boolean(errors.password)} />
              <p className="hint">At least 12 characters with upper-case, lower-case and a number.</p>
              {errors.password && <p className="field-error" role="alert">{errors.password}</p>}
            </div>
            <div>
              <label htmlFor="u-role" className="label">Role</label>
              <select id="u-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "author" | "admin" })} className="input">
                <option value="author">Author</option>
                <option value="admin">Administrator</option>
              </select>
              <p className="hint">{ROLE_HELP[form.role]}</p>
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? <Spinner /> : <UserPlus className="h-4 w-4" aria-hidden />}Create account</button>
            </div>
          </form>
        </section>
      ) : (
        <Alert kind="info">Creating accounts needs <code>SUPABASE_SERVICE_ROLE_KEY</code> on the server. You can still change existing roles.</Alert>
      )}

      <section aria-labelledby="team-h">
        <h2 id="team-h" className="mb-3 text-xl font-semibold">Accounts</h2>
        <ul className="card divide-y divide-border overflow-hidden">
          {users.map((u) => {
            const me = u.id === currentUserId;
            return (
              <li key={u.id} className={cn("grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center", !u.is_active && "opacity-60")}>
                <div className="min-w-0">
                  <p className="font-semibold">{u.display_name}{me && <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span>}{!u.is_active && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Deactivated</span>}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email ?? "email hidden"} · joined {formatDate(u.created_at, "short")}</p>
                </div>
                <div>
                  <label htmlFor={`role-${u.id}`} className="sr-only">Role for {u.display_name}</label>
                  <select id={`role-${u.id}`} value={u.role} disabled={me || pending} onChange={(e) => change(u, { role: e.target.value as Role })} className="input w-auto py-1.5">
                    <option value="admin">Administrator</option>
                    <option value="author">Author</option>
                    <option value="reader">Reader (no access)</option>
                  </select>
                </div>
                <button type="button" className="btn btn-outline btn-sm" disabled={me || pending} onClick={() => change(u, { isActive: !u.is_active })}>{u.is_active ? "Deactivate" : "Reactivate"}</button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
