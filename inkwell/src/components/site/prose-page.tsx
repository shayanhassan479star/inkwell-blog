import { PageHeader } from "./section-heading";

export function ProsePage({ eyebrow, title, description, updated, children }: { eyebrow?: string; title: string; description?: string; updated?: string; children: React.ReactNode }) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="container pb-8">
        <div className="prose prose-lg max-w-3xl font-serif dark:prose-invert prose-headings:font-display prose-a:text-accent">
          {updated && <p className="text-sm text-muted-foreground">Last updated: {updated}</p>}
          {children}
        </div>
      </div>
    </>
  );
}
