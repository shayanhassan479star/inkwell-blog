import type { Metadata } from "next";
import { ProsePage } from "@/components/site/prose-page";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy", alternates: { canonical: "/privacy" } };

/**
 * TEMPLATE: this policy describes what the software does by default. Review it with a qualified
 * professional and adapt it to your jurisdiction, hosting and any extra tools (analytics, email provider…).
 */
export default function PrivacyPage() {
  return (
    <ProsePage eyebrow="Legal" title="Privacy policy" updated="1 January 2026">
      <p>This policy explains what personal data {site.name} collects, why, and the choices you have.</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Contact form:</strong> your name, email address and message, so we can reply. Retained until the conversation is finished, then deleted on request.</li>
        <li><strong>Comments:</strong> your name, email address (never displayed) and comment. Comments are held for moderation; your name and text are shown publicly once approved.</li>
        <li><strong>Newsletter:</strong> your email address and the time and wording of your consent. Every email includes an unsubscribe link, and unsubscribing stops all sending.</li>
        <li><strong>Reading statistics:</strong> a simple count of article views. We use no tracking cookies, do not store IP addresses for this, and honour the browser&apos;s Do Not Track and Global Privacy Control signals.</li>
        <li><strong>Abuse protection:</strong> to limit spam we keep a salted, one-way hash of your IP address alongside form submissions. It cannot be reversed into your IP address.</li>
      </ul>
      <h2>Cookies and local storage</h2>
      <p>Visitors receive no tracking or advertising cookies. Your light/dark preference is saved in your browser&apos;s local storage. Signed-in staff receive a strictly necessary session cookie.</p>
      <h2>Where data is stored</h2>
      <p>Data is stored with our database and hosting providers (Supabase and the hosting platform used to serve this site), who act as processors on our behalf.</p>
      <h2>AI tools</h2>
      <p>The author may use an AI service to assist with drafting and editing. Reader data — messages, comments and email addresses — is never sent to AI services.</p>
      <h2>Your rights</h2>
      <p>Depending on where you live you may have the right to access, correct, delete or export your data, to object to processing, and to withdraw consent at any time. To exercise these rights, use the contact form or email us{site.contactEmail ? <> at <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a></> : null}.</p>
      <h2>Changes</h2>
      <p>We may update this policy; the date above shows when it last changed.</p>
    </ProsePage>
  );
}
