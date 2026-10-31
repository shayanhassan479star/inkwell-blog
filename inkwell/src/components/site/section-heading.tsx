import Link from "next/link";

export function SectionHeading({ title, eyebrow, href, hrefLabel = "View all" }: { title: string; eyebrow?: string; href?: string; hrefLabel?: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4 border-t border-foreground/80 pt-4">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 className="text-2xl font-semibold md:text-3xl">{title}</h2>
      </div>
      {href && <Link href={href} className="shrink-0 text-sm font-medium text-accent hover:underline">{hrefLabel} →</Link>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: React.ReactNode }) {
  return (
    <header className="container pb-10 pt-12 md:pt-20">
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] md:text-6xl">{title}</h1>
      {description && <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{description}</p>}
      {children}
    </header>
  );
}
