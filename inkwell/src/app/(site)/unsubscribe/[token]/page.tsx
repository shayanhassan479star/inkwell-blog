import type { Metadata } from "next";
import { Alert } from "@/components/ui/feedback";
import { PageHeader } from "@/components/site/section-heading";
import { unsubscribe } from "@/lib/actions/public";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };

export default async function UnsubscribePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string; error?: string }> }) {
  const { token } = await params;
  const sp = await searchParams;
  const action = unsubscribe.bind(null, token);
  return (
    <>
      <PageHeader eyebrow="Newsletter" title="Unsubscribe" />
      <div className="container max-w-xl pb-16">
        {sp.done ? (
          <Alert kind="success" title="You've been unsubscribed">You won&apos;t receive any more emails. Sorry to see you go.</Alert>
        ) : (
          <form action={action} className="space-y-4">
            {sp.error && <Alert kind="error">Something went wrong. Please try again.</Alert>}
            <p className="text-muted-foreground">Confirm that you no longer want to receive emails about new articles.</p>
            <button type="submit" className="btn btn-primary">Yes, unsubscribe me</button>
          </form>
        )}
      </div>
    </>
  );
}
