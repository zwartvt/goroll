import { createFileRoute, Link } from "@tanstack/react-router";
import { useGameData } from "@/lib/useGame";
import { PageFrame } from "@/components/app/Frame";
import { ArrowLeft, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { getSession } from "@/lib/game";
import { pushLog } from "@/lib/log";

export const Route = createFileRoute("/campaign/achievements")({ component: Page });

const COLORS = [
  { v: "yellow", c: "#fbbf24" }, { v: "red", c: "#ef4444" },
  { v: "gray", c: "#9ca3af" }, { v: "green", c: "#22c55e" },
  { v: "blue", c: "#3b82f6" }, { v: "purple", c: "#a855f7" },
];

function Page() {
  const { character, characters, achievements, campaign, loading } = useGameData();
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("yellow");
  const [targets, setTargets] = useState<string[]>([]);
  const session = getSession();
  const isDM = session?.role === "dm";

  if (loading || !character) return <PageFrame><p className="text-center text-muted-foreground">Cargando...</p></PageFrame>;

  const players = characters.filter(c => c.role === "player");

  async function add() {
    if (!label.trim()) return;
    let targetIds: string[];
    if (isDM) {
      if (!targets.length) return;
      targetIds = targets;
    } else {
      targetIds = [character!.id];
    }
    const rows = targetIds.map(id => ({ character_id: id, label: label.trim(), color }));
    await supabase.from("achievements").insert(rows);
    if (isDM && campaign) {
      const named = players.filter(p => targetIds.includes(p.id));
      await pushLog(campaign.id, [
        { t: "char", v: character!.name, color: character!.color },
        { t: "text", v: `otorgó el logro "${label.trim()}" a ${named.map(n => n.name).join(", ")}` },
      ] as any);
    }
    setLabel(""); setTargets([]);
  }
  async function remove(id: string) { await supabase.from("achievements").delete().eq("id", id); }

  // Visible list: player sees only own; DM sees all in campaign grouped
  const visible = isDM
    ? achievements
    : achievements.filter(a => a.character_id === character.id);

  return (
    <PageFrame title="Logros" subtitle={character.name} right={<Link to="/campaign/profile" className="text-muted-foreground"><ArrowLeft size={20}/></Link>}>
      <div className="ornate-card p-6 text-center mb-4">
        <Trophy className="mx-auto text-[var(--gold)]" size={48} />
      </div>
      <div className="ornate-card p-4 space-y-2">
        {visible.map(a => {
          const cc = COLORS.find(c => c.v === a.color)?.c || "#fbbf24";
          const owner = characters.find(c => c.id === a.character_id);
          return (
            <div key={a.id} className="flex justify-between items-center px-3 py-2 rounded"
              style={{ background: `color-mix(in oklab, ${cc} 25%, transparent)`, color: cc, border: `1px solid ${cc}` }}>
              <span className="font-semibold text-sm">
                {a.label}
                {isDM && owner && <span className="ml-2 opacity-70 text-xs">— {owner.name}</span>}
              </span>
              {isDM && <button onClick={() => remove(a.id)} className="text-xs opacity-70 hover:opacity-100">✕</button>}
            </div>
          );
        })}
        {!visible.length && <p className="text-center text-xs text-muted-foreground py-4">Aún sin logros.</p>}
      </div>
      {isDM && (
        <div className="ornate-card p-4 mt-4 space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Otorgar logro</p>
          <input className="w-full bg-input border border-border rounded px-3 py-2 text-sm" placeholder="Vencedor del dragón..." value={label} onChange={e => setLabel(e.target.value)} />
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button key={c.v} onClick={() => setColor(c.v)} className="w-7 h-7 rounded-full border-2"
                style={{ background: c.c, borderColor: color === c.v ? "var(--gold)" : "transparent" }} />
            ))}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Destinatarios</p>
              <button className="text-xs underline text-[var(--gold)]"
                onClick={() => setTargets(targets.length === players.length ? [] : players.map(p => p.id))}>
                {targets.length === players.length ? "Ninguno" : "Todos"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {players.map(p => {
                const sel = targets.includes(p.id);
                return (
                  <button key={p.id} onClick={() => setTargets(sel ? targets.filter(x => x !== p.id) : [...targets, p.id])}
                    className="text-xs px-2 py-1 rounded border"
                    style={sel
                      ? { background: p.color, color: "#000", borderColor: p.color }
                      : { borderColor: "var(--border)", color: p.color }}>
                    {p.name}
                  </button>
                );
              })}
              {!players.length && <p className="text-xs text-muted-foreground">Sin jugadores en la campaña.</p>}
            </div>
          </div>
          <button className="btn-fantasy w-full" onClick={add} disabled={!label.trim() || !targets.length}>
            Otorgar a {targets.length || 0} jugador(es)
          </button>
        </div>
      )}
    </PageFrame>
  );
}
