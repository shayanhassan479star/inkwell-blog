import { cn } from "@/lib/utils";
import { STATUS_LABEL, type EffectiveStatus } from "@/lib/post-status";

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const BADGE: Record<EffectiveStatus, string> = {
  published: "border-success/40 bg-success/10 text-success",
  scheduled: "border-accent/40 bg-accent/10 text-accent",
  draft: "border-border bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: EffectiveStatus }) {
  return <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium", BADGE[status])}>{STATUS_LABEL[status]}</span>;
}

export function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-4xl font-semibold tabular-nums">{typeof value === "number" ? value.toLocaleString("en-GB") : value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Daily views as an accessible SVG bar chart (with a screen-reader table). */
export function ViewsChart({ data }: { data: { day: string; views: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.views));
  const total = data.reduce((s, d) => s + d.views, 0);
  const W = 560, H = 140, gap = 6;
  const bw = (W - gap * (data.length - 1)) / Math.max(1, data.length);
  const label = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H + 22}`} role="img" aria-label={`Article views over the last ${data.length} days: ${total} in total`} className="h-auto w-full">
        {[0.5, 1].map((f) => (
          <line key={f} x1="0" x2={W} y1={H - H * f} y2={H - H * f} stroke="hsl(var(--border))" strokeDasharray="3 4" />
        ))}
        {data.map((d, i) => {
          const h = Math.max(d.views > 0 ? 3 : 1, (d.views / max) * (H - 8));
          return (
            <g key={d.day}>
              <title>{`${label(d.day)}: ${d.views} view${d.views === 1 ? "" : "s"}`}</title>
              <rect x={i * (bw + gap)} y={H - h} width={bw} height={h} rx="3" fill={d.views > 0 ? "hsl(var(--accent))" : "hsl(var(--border))"} />
            </g>
          );
        })}
        <text x="0" y={H + 16} fontSize="11" fill="hsl(var(--muted-foreground))">{data[0] ? label(data[0].day) : ""}</text>
        <text x={W} y={H + 16} fontSize="11" textAnchor="end" fill="hsl(var(--muted-foreground))">{data.at(-1) ? label(data.at(-1)!.day) : ""}</text>
        <text x={W} y="12" fontSize="11" textAnchor="end" fill="hsl(var(--muted-foreground))">peak {max}</text>
      </svg>
      <figcaption className="sr-only">
        <table>
          <caption>Views per day</caption>
          <tbody>{data.map((d) => <tr key={d.day}><th scope="row">{label(d.day)}</th><td>{d.views}</td></tr>)}</tbody>
        </table>
      </figcaption>
    </figure>
  );
}
