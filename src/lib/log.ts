import { supabase } from "@/integrations/supabase/client";
import type { Segment } from "./game";

/**
 * undo describes the inverse action so the DM can revert it from the log.
 * Supported kinds:
 *  - { kind: "item.update", id, prev: { ...fields } } — restore previous item state
 *  - { kind: "item.recreate", item: <full row> } — re-insert deleted item
 *  - { kind: "character.update", id, prev: { ...fields } } — restore character fields (hp, coins, stats...)
 *  - { kind: "achievement.delete", id } — remove an achievement granted by mistake
 *  - { kind: "achievement.recreate", row } — re-insert deleted achievement
 */
export type UndoAction =
  | { kind: "item.update"; id: string; prev: Record<string, any> }
  | { kind: "item.recreate"; item: Record<string, any> }
  | { kind: "character.update"; id: string; prev: Record<string, any> }
  | { kind: "achievement.delete"; id: string }
  | { kind: "achievement.recreate"; row: Record<string, any> };

export async function pushLog(campaignId: string, segments: Segment[], undo?: UndoAction) {
  await supabase.from("logs").insert({
    campaign_id: campaignId,
    segments: segments as any,
    undo: (undo as any) ?? null,
  } as any);
}