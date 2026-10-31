import type { Metadata } from "next";
import { ContactForm } from "@/components/site/contact-form";
import { PageHeader } from "@/components/site/section-heading";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with ${site.name}.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <PageHeader eyebrow="Contact" title="Let's talk." description="Questions, corrections, ideas or collaboration — send a note and I'll reply as soon as I can." />
      <div className="container grid gap-12 pb-8 lg:grid-cols-[2fr_1fr]">
        <div className="card p-6 md:p-8"><ContactForm /></div>
        <aside className="space-y-4 text-sm text-muted-foreground">
          <p>Messages are stored securely and only visible to the site owner.</p>
          {site.contactEmail && <p>Prefer email? <a className="font-medium text-accent hover:underline" href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a></p>}
          <p>Response times vary, but I read everything.</p>
        </aside>
      </div>
    </>
  );
}
