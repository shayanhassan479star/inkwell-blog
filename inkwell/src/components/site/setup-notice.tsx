import { Alert } from "@/components/ui/feedback";

/** Shown instead of content when Supabase environment variables are missing. Only used in development-like states. */
export function SetupNotice() {
  return (
    <div className="container py-16">
      <Alert kind="info" title="Almost there — connect your database">
        <p>
          This site is running, but it can&apos;t reach Supabase yet. Copy <code>.env.example</code> to <code>.env.local</code>, fill in
          <code> NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, run the SQL in <code>supabase/migrations</code>, then restart.
          The README walks through every step.
        </p>
      </Alert>
    </div>
  );
}
