## Plan: Campaign selection modal, app personalization (i18n + themes), character renaming, stats icon/labels

This is a large multi-part change. I'll split it into 4 phases. Confirm before I start.

---

### Phase 1 — Campaign selection modal & DM role handling

**Index page (campaign selection):**
- Clicking a campaign card opens a modal with 3 buttons:
  - **Jugar campaña** → enters as before.
  - **Editar campaña** → opens a manager modal showing all `campaign_members` of that campaign; the owner can toggle each member between `player` and `dm` (co-DM). Also exposes existing flags (`single_dm_only`, `max_players`, new "lock character name" flag).
  - **Eliminar campaña** → only visible to `owner_user_id`. Reuses existing `DeleteCampaignButton` confirmation ("Eliminar" typed).
- Remove the delete button from the in-campaign "Escena" view (`Escenario.tsx` / `campaign.dm.tsx`).

**DM identity in the app:**
- When the current user's role for the campaign is `dm`:
  - They do NOT appear in the Escenario "Mesa de jugadores" online list, even if they have a character in the campaign.
  - Their character is excluded from `onlineIds` presence rendering for that campaign.
- Log naming for DMs:
  - Owner DM → shown as **"DM"** in log segments.
  - Co-DMs → numbered in order of joining as **"Co-DM"**, **"Co-DM 2"**, **"Co-DM 3"**, …
  - Done at render time in `LogSegments.tsx` using a map built from `campaign_members` (ordered by `created_at`), so we don't have to rewrite history.

**MasterAcc1000 tools (`/master`):**
- Add a "Herramientas" section:
  - **Restaurar campañas eliminadas**: requires a `deleted_campaigns` archive table — when a non-master user deletes, instead of hard-delete we snapshot the campaign + related rows into one JSONB row and remove originals. Master can restore (re-insert) or permanently purge.
  - **Borrar definitivamente**: hard-delete from archive.
- Migration:
  - `deleted_campaigns(id uuid pk, original_id uuid, name text, owner_user_id uuid, payload jsonb, deleted_at timestamptz default now())`.
- Update `DeleteCampaignButton` logic to first snapshot to `deleted_campaigns` then cascade-delete.

---

### Phase 2 — App personalization (settings gear on home)

**Settings entry point:**
- Add a gear icon top-left of `/` (login/home screen).
- Opens a Settings modal/panel with tabs: **Idioma**, **Tema**, **Acerca de**.

**Internationalization (ES / EN):**
- Add lightweight i18n: `src/lib/i18n.tsx` with a `LanguageProvider` + `useT()` hook. Translations stored as nested objects in `src/lib/locales/es.ts` and `src/lib/locales/en.ts`.
- Persisted to `localStorage` (`app:lang`). Default: `es`.
- Replace hardcoded user-facing strings across every route, modal, button, toast, log template — full pass. (This is the bulk of the work in this phase.)
- Translations are written for meaning, not word-for-word.

**Theme / color customization:**
- Add a theme provider that swaps a CSS variable set on `<html data-theme="...">`.
- Themes: Vino (default), Azul, Rojo, Rosa, Verde, Amarillo, Morado, Aguamarina, Café, Blanco, Negro.
- Each theme defines `--bg`, `--panel`, `--panel-2`, `--text`, `--text-muted`, `--accent`, `--accent-2` in `oklch`, hand-tuned so panel ≠ background and text contrast ≥ WCAG AA against panel.
- Persisted to `localStorage` (`app:theme`). Affects backgrounds, cards, panels, log boxes, modals.
- Update `styles.css` to consume these vars in semantic tokens (`--background`, `--card`, `--popover`, etc.) so existing Tailwind classes pick the new theme automatically.

**Character name editing from inside the app:**
- In the character "Stats" panel (renamed below), add an editable name field next to the avatar. Saving updates `characters.name`.
- Realtime already propagates the change; the home screen character cards also read from `characters` so they update automatically.
- New campaign flag `lock_character_names boolean default false` on `campaigns`. When `true`, the name field is read-only for players (DM can still edit). Shown as a checkbox in campaign create form below "Solo un DM en la campaña".

---

### Phase 3 — Character "Stats" rename, icon, and Combate base layout

- Rename character settings button label from "Configuración" → **Estadísticas** / **Stats** (via i18n).
- Replace the gear icon with `User` (lucide) outline for the character settings entry. Keep the actual app-settings gear on the home screen.
- "Combate base" section in the stats panel: remove `truncate` / `text-ellipsis` on labels; switch to `whitespace-normal break-words` and step font-size down (`text-[11px]` → `text-[10px]`) when label length > N, or just allow wrap on two lines. Verify on 558px viewport (current preview width) that no label is cut.

---

### Phase 4 — Verification

- Click through: campaign select modal (Play / Edit / Delete), DM presence hiding, log labels (DM, Co-DM, Co-DM 2), language toggle round-trip on every route, each theme on every route, character rename propagation, stats icon + label, combate-base labels uncut at 558px.
- Inspect console & network for errors.

---

### Technical notes

- New tables: `deleted_campaigns`. New columns: `campaigns.lock_character_names`.
- New files: `src/lib/i18n.tsx`, `src/lib/locales/es.ts`, `src/lib/locales/en.ts`, `src/lib/theme.tsx`, `src/components/app/AppSettingsModal.tsx`, `src/components/app/CampaignActionsModal.tsx`, `src/components/app/CampaignMembersEditor.tsx`.
- Touched: `styles.css` (theme vars), `index.tsx`, `master.tsx`, `campaign.profile.tsx`, `Escenario.tsx`, `CharacterSheetModal.tsx`, `LogSegments.tsx`, `CampaignProvider.tsx`, `DeleteCampaignButton.tsx`, plus every route/component with user-facing copy for i18n.

---

### Scope estimate

Phase 2 (i18n full pass + themes) is by far the largest — touches almost every component. Want me to proceed with all 4 phases in one go, or stage them (e.g., Phase 1 + 3 first, then 2)?
