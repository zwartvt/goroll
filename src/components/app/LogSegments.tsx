import type { ReactNode } from "react";
import { RARITY_COLOR, type Segment } from "@/lib/game";

export function LogSegments({
  segments,
  onItem,
  onChar,
}: {
  segments: Segment[];
  onItem?: (id: string) => void;
  onChar?: (id: string) => void;
}) {
  const out: ReactNode[] = [];
  segments.forEach((s, i) => {
    if (i > 0) out.push(<span key={`sp${i}`}> </span>);
    if (s.t === "text") out.push(<span key={i} className="text-foreground/85">{s.v}</span>);
    else if (s.t === "char") {
      const clickable = onChar && s.id;
      out.push(
        <strong key={i}
          className={clickable ? "cursor-pointer hover:underline" : ""}
          onClick={clickable ? () => onChar!(s.id!) : undefined}
          style={{ color: s.color }}>{s.v}</strong>
      );
    } else if (s.t === "item") {
      const clickable = onItem && s.id;
      out.push(
        <em key={i}
          className={`not-italic underline underline-offset-2 ${clickable ? "cursor-pointer" : ""}`}
          onClick={clickable ? () => onItem!(s.id!) : undefined}
          style={{ color: RARITY_COLOR[s.rarity] }}>{s.v}</em>
      );
    }
    else if (s.t === "coins") out.push(<span key={i} style={{ color: "var(--gold)" }} className="font-semibold">🪙 {s.v}</span>);
    else if (s.t === "gain") out.push(<span key={i} style={{ color: "var(--gain)" }} className="font-semibold">{s.v}</span>);
    else if (s.t === "loss") out.push(<span key={i} style={{ color: "var(--loss)" }} className="font-semibold">{s.v}</span>);
  });
  return <span>{out}</span>;
}
