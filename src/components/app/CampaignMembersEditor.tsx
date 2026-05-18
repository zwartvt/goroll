import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { toastSaved } from "@/lib/saved";
import type { Campaign } from "@/lib/game";

type Member = { id: string; user_id: string; role: "player" | "dm"; created_at: string };
type AppUser = { id: string; username: string };

export function CampaignMembersEditor({ campaign, onBack }: { campaign: Campaign; onBack: () => void }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [users, setUsers] = useState<Record<string, AppUser>>({});
  const [singleDmOnly, setSingleDmOnly] = useState<boolean>(!!(campaign as any).single_dm_only);
  const [lockNames, setLockNames] = useState<boolean>(!!(campaign as any).lock_character_names);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const { data } = await (supabase as any).from("campaign_members")
      .select("*").eq("campaign_id", campaign.id).order("created_at");
    const ms = (data || []) as Member[];
    setMembers(ms);
    const ids = ms.map(m => m.user_id);
    if (ids.length) {
      const { data: us } = await (supabase as any).from("app_users").select("id,username").in("id", ids);
      const map: Record<string, AppUser> = {};
      (us || []).forEach((u: AppUser) => { map[u.id] = u; });
      setUsers(map);
    }
  }
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [campaign.id]);

  async function setRole(m: Member, next: "player" | "dm") {
    if (m.role === next) return;
    setBusy(true);
    try {
      await (supabase as any).from("campaign_members").update({ role: next }).eq("id", m.id);
      toastSaved("Rol actualizado");
      reload();
    } finally { setBusy(false); }
  }

  async function removeMember(m: Member) {
    if (m.user_id === (campaign as any).owner_user_id) { toast.error("No puedes quitar al creador."); return; }
    if (!confirm(`¿Quitar a ${users[m.user_id]?.username || "este usuario"} de la campaña?`)) return;
    setBusy(true);
    try {
      await (supabase as any).from("campaign_members").delete().eq("id", m.id);
      // Also remove any DM character belonging to them (player characters stay).
      const { data: chars } = await (supabase as any).from("characters")
        .select("id").eq("campaign_id", campaign.id).eq("user_id", m.user_id).eq("role", "dm");
      const ids = (chars || []).map((c: any) => c.id);
      if (ids.length) await (supabase as any).from("characters").delete().in("id", ids);
      toastSaved("Usuario removido");
      reload();
    } finally { setBusy(false); }
  }

  async function saveFlags() {
    setBusy(true);
    try {
      await (supabase as any).from("campaigns")
        .update({ single_dm_only: singleDmOnly, lock_character_names: lockNames })
        .eq("id", campaign.id);
      toastSaved();
    } finally { setBusy(false); }
  }

  const owner = (campaign as any).owner_user_id as string | null;

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-xs underline text-muted-foreground">← Volver</button>
      <h3 className="font-display text-lg text-center text-[var(--gold)]">Editar campaña</h3>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground text-center">{campaign.name}</p>

      <div className="ornate-card p-3 space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Reglas</p>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input type="checkbox" checked={singleDmOnly} onChange={e => setSingleDmOnly(e.target.checked)} />
          Solo un Dungeon Master en la campaña
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input type="checkbox" checked={lockNames} onChange={e => setLockNames(e.target.checked)} />
          Bloquear edición del nombre de personaje
        </label>
        <button className="btn-fantasy w-full text-xs" disabled={busy} onClick={saveFlags}>Guardar reglas</button>
      </div>

      <div className="ornate-card p-3 space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Usuarios en la campaña ({members.length})</p>
        {members.map(m => {
          const u = users[m.user_id];
          const isOwner = m.user_id === owner;
          return (
            <div key={m.id} className="bg-secondary/40 rounded px-2 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-sm truncate">{u?.username || m.user_id.slice(0, 8)} {isOwner && "👑"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {isOwner ? "Creador (DM permanente)" : m.role === "dm" ? "Co-Dungeon Master" : "Jugador"}
                  </p>
                </div>
                {!isOwner && (
                  <button onClick={() => removeMember(m)} disabled={busy}
                    className="text-[10px] text-[var(--loss)] underline">Quitar</button>
                )}
              </div>
              {!isOwner && (
                <div className="grid grid-cols-2 gap-1 mt-2">
                  <button
                    className={`text-[10px] py-1 rounded border ${m.role === "player" ? "bg-[var(--gold)] text-black border-transparent" : "border-border"}`}
                    onClick={() => setRole(m, "player")} disabled={busy}>🗡️ Jugador</button>
                  <button
                    className={`text-[10px] py-1 rounded border ${m.role === "dm" ? "bg-[var(--gold)] text-black border-transparent" : "border-border"}`}
                    onClick={() => setRole(m, "dm")} disabled={busy || singleDmOnly}>👑 Co-DM</button>
                </div>
              )}
            </div>
          );
        })}
        {!members.length && <p className="text-[10px] text-muted-foreground">Sin usuarios todavía.</p>}
        {singleDmOnly && (
          <p className="text-[9px] text-muted-foreground">⚠️ "Solo un DM" está activado: no puedes asignar Co-DMs.</p>
        )}
      </div>
    </div>
  );
}
