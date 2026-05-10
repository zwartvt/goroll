# Plan: Realtime, Duplicados de Potenciadores, y Co-DM

## 1. Realtime en todas las vistas

**Problema:** Los cambios (HP, objetos, potenciadores, logs, condiciones) no se reflejan en tiempo real. Hay que recargar el perfil.

**Solución:** Crear un hook genérico `useRealtimeRefetch(campaignId, tables, callback)` y aplicarlo en todas las rutas principales:
- `campaign.profile.tsx` — characters, items, character_conditions, achievements, logs, boosters
- `campaign.dm.tsx` — characters, items, boosters, logs, character_conditions
- `campaign.equipment.tsx`, `campaign.inventory.tsx`, `campaign.boosters.tsx`, `campaign.spectator.tsx`, `campaign.achievements.tsx` — sus tablas relevantes
- `CharacterSheetModal.tsx` — refrescar datos del personaje abierto

Cada hook se suscribe a `postgres_changes` filtrando por `campaign_id` y vuelve a cargar el estado local cuando llega un cambio. Asegurar canales con nombres únicos (`realtime:{ruta}:{campaignId}`) y limpieza al desmontar.

**Migración:** Asegurar que `characters`, `items`, `boosters`, `logs`, `character_conditions`, `achievements`, `campaigns`, `campaign_members` están en `supabase_realtime` con `REPLICA IDENTITY FULL`.

## 2. Eliminar potenciadores duplicados

En `campaign.dm.tsx`, dentro del tab de Potenciadores, añadir un botón **"Eliminar duplicados"** que:
- Agrupa por `name` (case-insensitive trimmed)
- Conserva el primero (el más antiguo) y borra el resto
- Muestra confirmación previa con conteo de cuántos se eliminarán
- Loguea la acción

## 3. Sistema de Co-DM con aprobación

**Migración SQL:**
- Añadir `campaigns.single_dm_only BOOLEAN DEFAULT false`
- Crear tabla `dm_join_requests`:
  - `id`, `campaign_id`, `requester_user_id`, `requester_username` (snapshot), `status` ('pending'|'approved'|'rejected'), `created_at`, `resolved_at`
- Habilitar realtime en ambas

**UI Crear campaña** (`master.tsx` o donde se crea): checkbox "Solo un Dungeon Master en la campaña".

**Flujo de entrada como DM** (`campaign.tsx` o donde se hace join):
1. Usuario selecciona "Entrar como DM" en una campaña existente.
2. Si el usuario ES el `owner_user_id`, entra directo.
3. Si NO es owner:
   - Si `single_dm_only=true` → rechazo automático con toast.
   - Si hay rechazo previo (<60s) → toast "Espera X segundos".
   - Si no, crear `dm_join_requests` con `status='pending'`. Mostrar pantalla "Esperando aprobación del DM original" con polling/realtime.
4. Cuando se aprueba → insertar en `campaign_members` con `role='dm'` y redirigir a `/campaign/dm`.
5. Cuando se rechaza → toast y volver atrás. El cliente registra timestamp local de cooldown.

**UI del DM original:**
Componente global `DMRequestGate` montado en `campaign.dm.tsx` (y al cargar la app si el usuario tiene campañas como owner). Hace query de `dm_join_requests` con `status='pending'` para sus campañas. Si encuentra alguna, muestra **AlertDialog modal bloqueante** (no se puede cerrar) con:
- Nombre de la campaña
- Username del solicitante
- Botones **Sí** / **No**

El diálogo persiste entre sesiones porque la solicitud sigue pendiente en BD; cada vez que el DM entra, vuelve a aparecer hasta resolverla.

**Bug "carga infinita al entrar como DM":** Probablemente `useGameData` no maneja el caso de un `app_user` distinto al `owner_user_id` que intenta cargar la vista de DM. Revisar `useGame.ts` y `campaign.tsx` para asegurar que tras aprobación el `campaign_members` con role='dm' permite cargar la vista. Mientras tanto, evitar el loop infinito mostrando la pantalla de "Esperando aprobación" en su lugar.

## Orden de ejecución

1. Migración SQL (single_dm_only + dm_join_requests + realtime publications).
2. Crear `src/hooks/useRealtimeRefetch.ts`.
3. Aplicar hook a todas las rutas listadas + CharacterSheetModal.
4. Botón "Eliminar duplicados" en tab Potenciadores del DM.
5. Checkbox "Solo un DM" al crear campaña.
6. Flujo de solicitud Co-DM en pantalla de selección de rol.
7. Componente `DMRequestGate` en vista DM.
8. Fix del loop de carga.

## Archivos clave a modificar
- **Nuevo:** `src/hooks/useRealtimeRefetch.ts`, `src/components/app/DMRequestGate.tsx`
- **Editar:** `campaign.profile.tsx`, `campaign.dm.tsx`, `campaign.equipment.tsx`, `campaign.inventory.tsx`, `campaign.boosters.tsx`, `campaign.spectator.tsx`, `campaign.achievements.tsx`, `CharacterSheetModal.tsx`, `campaign.tsx`, `master.tsx`, `useGame.ts`
