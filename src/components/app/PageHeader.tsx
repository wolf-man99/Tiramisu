export function PageHeader({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        {icon && <span className="mt-0.5 grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)]">{icon}</span>}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
