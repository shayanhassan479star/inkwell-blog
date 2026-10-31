import { Download } from "lucide-react";
import { SubscriberDelete } from "@/components/admin/moderation";
import { PageHeader } from "@/components/admin/ui";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { listSubscribers } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { newsletterEnabled } from "@/lib/env";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Subscribers" };

export default async function SubscribersPage() {
  const ctx = await requireAdmin();
  const subs = await listSubscribers(ctx);
  const active = subs.filter((s) => !s.unsubscribed_at);

  return (
    <>
      <PageHeader
        title="Subscribers"
        description={`${active.length.toLocaleString("en-GB")} active · ${(subs.length - active.length).toLocaleString("en-GB")} unsubscribed`}
        actions={<a href="/api/admin/subscribers/export" className="btn btn-outline"><Download className="h-4 w-4" aria-hidden />Export active (CSV)</a>}
      />
      <Alert kind="info" className="mb-6" title="This list is for you to use with an email service">
        Inkwell stores each address with the consent wording and timestamp, and every subscriber has a one-click unsubscribe link. It does not send newsletters itself — export the active list into a provider such as Buttondown, Mailchimp or Resend, and keep honouring unsubscribes.
        {!newsletterEnabled() && " The sign-up form is currently switched off (NEWSLETTER_ENABLED=false)."}
      </Alert>
      {subs.length === 0 ? (
        <EmptyState title="No subscribers yet">The sign-up form appears in the footer and under each article.</EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th scope="col" className="px-5 py-3 font-semibold">Email</th><th scope="col" className="px-5 py-3 font-semibold">Consent given</th><th scope="col" className="px-5 py-3 font-semibold">Status</th><th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subs.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-3 font-medium">{s.email}</td>
                  <td className="px-5 py-3 text-muted-foreground">{formatDate(s.consent_at)}</td>
                  <td className="px-5 py-3">{s.unsubscribed_at ? <span className="text-muted-foreground">Unsubscribed {formatDate(s.unsubscribed_at, "short")}</span> : <span className="text-success">Active</span>}</td>
                  <td className="px-5 py-3 text-right"><SubscriberDelete id={s.id} email={s.email} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
