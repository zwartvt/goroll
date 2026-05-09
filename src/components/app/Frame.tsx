import type { ReactNode } from "react";
export function PageFrame({ children, title, subtitle, right }: { children: ReactNode; title?: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 pb-24 pt-6">
      {(title || right) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h1 className="rune-glow text-2xl font-display font-bold text-foreground">{title}</h1>}
            {subtitle && <p className="text-xs uppercase tracking-widest text-muted-foreground">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      {title && <div className="gem-divider mb-5" />}
      {children}
    </div>
  );
}
