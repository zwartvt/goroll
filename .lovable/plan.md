## Plan

### 1. Pop-up "Jugador no encontrado"
En `LogSegments.tsx`, cuando se hace click sobre un nombre de jugador (`s.t === "char"`) y el `onChar` resuelve a un personaje que no existe en la campaña actual, mostrar un toast/modal: **"Jugador no encontrado"**. Implementación: el handler `onChar` en `campaign.profile.tsx` y `campaign.dm.tsx` consulta `characters` por id; si devuelve `null`, dispara `toast.error("Jugador no encontrado")` en lugar de abrir el `CharacterSheetModal`.

### 2. Sistema de Potenciadores

**Base de datos** (migración):
```sql
CREATE TABLE public.boosters (
  id uuid PK default gen_random_uuid(),
  campaign_id uuid NOT NULL,
  name text NOT NULL,
  rarity item_rarity NOT NULL DEFAULT 'white',
  uses int NOT NULL DEFAULT 1,
  max_uses int NOT NULL DEFAULT 1,
  owner_character_id uuid NULL,        -- NULL = en Vault del DM
  in_dm_vault boolean NOT NULL DEFAULT false,
  created_at timestamptz default now()
);
ALTER PUBLICATION supabase_realtime ADD TABLE public.boosters;
-- RLS public_all (consistente con resto del proyecto)
```

**Vista del jugador** (`campaign.equipment.tsx` y nueva ruta `campaign.boosters.tsx`):
- Añadir un cuarto botón en la cuadrícula de "Equipo / Mochila / Logros" llamado **"Potenciadores"** con fondo morado (`var(--rarity-purple)`), debajo del último.
- Nueva ruta `/campaign/boosters` muestra cuadros estilo equipamiento (grid). Cada carta muestra nombre, badge de rareza, "X / Y usos".
- Tap sobre carta abre modal con: **Usar** y **Detalles**.
- "Usar" muestra confirmación: *"¿Estás seguro que quieres usar este potenciador?"* → al confirmar:
  - `uses -= 1`. Si llega a 0 → DELETE.
  - `pushLog` con segmentos: char(jugador) + " usó " + item-style(nombre, rareza).

**Vista del DM** (`campaign.dm.tsx`):
- En la tab nav del DM, añadir botón **"Potenciadores"** entre "Vault" y "Players".
- Vista lista con buscador (input filtra por nombre, case-insensitive). Sin límite de filas.
- Cada fila: nombre, rareza, usos (X/Y), dueño (Vault o nombre del personaje). Acciones: **Editar** (modal: nombre, rareza, max_uses, uses — el DM puede poner 0), **Transferir** (select de personajes de la campaña + opción "Vault"), **Destruir**.
- En la tab **Crear** del DM, debajo del bloque de Efectos de Condición añadir bloque **"Crear potenciador"** con: input nombre, select rareza, input number "Usos" (default 1, min 0). Botón "Crear" → inserta con `in_dm_vault=true`, `owner_character_id=null`, `uses=max_uses`.
- Desde la vista del personaje (`CharacterSheetModal` para DM), añadir botón "Potenciadores" que muestra los del jugador con acciones **Quitar** (transferir a Vault) y **Transferir a otro jugador**.

**Reglas de negocio:**
- DM puede poseer/editar potenciadores con 0 usos. Jugador no puede usar uno con 0 usos (botón deshabilitado).
- "Transferir" cambia `owner_character_id` y `in_dm_vault` (true si destino = Vault, false si va a un jugador).
- Sin límites de capacidad para el DM (el Vault del DM es ilimitado, igual que para items).

**Archivos:**
- Nuevo: `src/routes/campaign.boosters.tsx`, `src/components/app/BoosterCard.tsx`, `src/components/app/BoosterEditor.tsx` (modal crear/editar), `src/components/app/BoosterTransferModal.tsx`.
- Modificados: `src/routes/campaign.equipment.tsx` (botón Potenciadores), `src/routes/campaign.dm.tsx` (tab + crear + sección de potenciadores del jugador), `src/components/app/CharacterSheetModal.tsx` (acceso a potenciadores del personaje desde DM), `src/components/app/LogSegments.tsx` o handlers `onChar` (toast no encontrado), `src/integrations/supabase/types.ts` (regenerado por migración), `src/lib/game.ts` (export `Booster` type).

### 3. Control de slots para el DM

Asumo: **slots de mochila por personaje** (capacidad de objetos en la mochila del jugador). Hoy `characters` no tiene tal columna; se añade `backpack_slots int NOT NULL DEFAULT 12`.

- Migración: `ALTER TABLE characters ADD COLUMN backpack_slots int NOT NULL DEFAULT 12`.
- En `campaign.inventory.tsx` mostrar contador "X / backpack_slots" y bloquear meter más objetos en mochila si se llena (item.equipped=false count).
- En `CharacterSheetModal.tsx` en modo DM añadir control "+/–" para `backpack_slots` (mín 1).
- `toastSaved()` al guardar.

> Nota: si en realidad te referías a otra cosa con "slots" (p. ej. slots de equipamiento, número de potenciadores máximo, o `max_players` de la campaña), avísame al revisar este plan y lo ajusto en una iteración corta.

### Resumen técnico
- 1 migración (tabla `boosters` + columna `backpack_slots` + realtime).
- ~3 nuevos componentes + 1 nueva ruta.
- Cambios menores en log handlers (toast jugador no encontrado).
- Sin nuevas dependencias.
