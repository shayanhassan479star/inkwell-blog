import type { Metadata } from "next";
import { ProsePage } from "@/components/site/prose-page";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of use", alternates: { canonical: "/terms" } };

/** TEMPLATE: review with a qualified professional before relying on it. */
export default function TermsPage() {
  return (
    <ProsePage eyebrow="Legal" title="Terms of use" updated="1 January 2026">
      <p>By using {site.name} you agree to these terms.</p>
      <h2>Content and copyright</h2>
      <p>Unless stated otherwise, articles and images are the property of the author. You may quote short excerpts with a clear credit and a link back to the original article. Please ask before republishing in full.</p>
      <h2>Information, not advice</h2>
      <p>Articles are published for general information. They are not professional, legal, medical or financial advice, and we make no guarantee that they are complete or current.</p>
      <h2>Comments and messages</h2>
      <p>Be respectful. We may remove comments that are abusive, unlawful, off-topic or promotional, and we moderate every comment before it appears. You keep ownership of what you write but grant us permission to display it on the site.</p>
      <h2>Acceptable use</h2>
      <p>Do not attempt to disrupt the site, probe it for vulnerabilities, scrape it in a way that harms performance, or submit automated or malicious content.</p>
      <h2>External links</h2>
      <p>We link to third-party sites we do not control and are not responsible for their content.</p>
      <h2>Liability</h2>
      <p>To the fullest extent permitted by law, the site is provided “as is” and we are not liable for losses arising from its use.</p>
      <h2>Contact</h2>
      <p>Questions about these terms? Use the contact form{site.contactEmail ? <> or email <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a></> : null}.</p>
    </ProsePage>
  );
}
