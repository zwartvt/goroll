import * as XLSX from "xlsx";
import type { Rarity } from "./game";

/** Datos parseados de un potenciador (antes de hablar con la BD). */
export type ParsedBooster = {
  external_id: string | null;
  tipo: string | null;
  rarity: Rarity;
  name: string;
  modo_lanzamiento: string | null;
  distancia: string | null;
  objetivos: string | null;
  dados: string | null;
  efecto: string;
};

export type ParseError = { where: string; message: string; raw?: string };

export type ParseResult = {
  rows: ParsedBooster[];
  errors: ParseError[];
};

const RARITY_ALIASES: Record<string, Rarity> = {
  blanca: "white", blanco: "white", comun: "white", común: "white", common: "white", white: "white",
  azul: "blue", rara: "blue", raro: "blue", blue: "blue",
  morada: "purple", morado: "purple", purpura: "purple", púrpura: "purple", epica: "purple", épica: "purple", purple: "purple",
  dorada: "gold", dorado: "gold", oro: "gold", legendaria: "gold", legendario: "gold", gold: "gold",
};

/** Quita tildes y normaliza a minúsculas para comparar etiquetas/encabezados. */
export function normKey(s: string): string {
  return (s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeName(s: string): string {
  return normKey(s).replace(/\s+/g, " ");
}

function rarityFrom(raw: any): Rarity | null {
  const k = normKey(String(raw ?? ""));
  return RARITY_ALIASES[k] ?? null;
}

function clean(v: any): string {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

/* ----------- XLSX ----------- */

const HEADER_MAP: Record<string, keyof ParsedBooster> = {
  "id": "external_id",
  "tipo": "tipo",
  "rareza": "rarity",
  "nombre": "name",
  "modo de lanzamiento": "modo_lanzamiento",
  "distancia": "distancia",
  "objetivos": "objetivos",
  "dados a tirar": "dados",
  "efecto o condicion": "efecto",
  "efecto ó condicion": "efecto",
  "efecto/condicion": "efecto",
  "efecto / condicion": "efecto",
};

export function parseXlsx(buf: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buf, { type: "array" });
  // Prefer the canonical sheet name; otherwise first sheet.
  const preferred = wb.SheetNames.find(n => normKey(n).includes("extra skills"))
    ?? wb.SheetNames[0];
  const sheet = wb.Sheets[preferred];
  if (!sheet) return { rows: [], errors: [{ where: "xlsx", message: "Hoja vacía" }] };

  const aoa: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  // Find header row: try row 2 first (index 1), then row 1 (index 0).
  const looksLikeHeader = (row: any[]) =>
    row.some(c => normKey(String(c)) in HEADER_MAP);
  let headerIdx = aoa.findIndex(r => looksLikeHeader(r));
  if (headerIdx < 0) return { rows: [], errors: [{ where: "xlsx", message: "No se encontraron encabezados (ID, Tipo, Rareza, ...)" }] };

  const headers = aoa[headerIdx].map(c => normKey(String(c)));
  const colMap: Record<number, keyof ParsedBooster> = {};
  headers.forEach((h, i) => {
    const k = HEADER_MAP[h];
    if (k) colMap[i] = k;
  });

  const rows: ParsedBooster[] = [];
  const errors: ParseError[] = [];
  for (let r = headerIdx + 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row || row.every(c => clean(c) === "")) continue;
    const draft: any = {};
    for (const [iStr, key] of Object.entries(colMap)) {
      draft[key] = clean(row[Number(iStr)]);
    }
    const where = `Fila ${r + 1}`;
    const built = buildRow(draft, where, errors);
    if (built) rows.push(built);
  }
  return { rows, errors };
}

/* ----------- TXT por bloques ----------- */

const TXT_LABELS: Record<string, keyof ParsedBooster> = {
  "id": "external_id",
  "tipo": "tipo",
  "rareza": "rarity",
  "nombre": "name",
  "modo de lanzamiento": "modo_lanzamiento",
  "distancia": "distancia",
  "objetivos": "objetivos",
  "dados a tirar": "dados",
  "efecto o condicion": "efecto",
  "efecto ó condicion": "efecto",
  "efecto/condicion": "efecto",
};

export function parseTxt(text: string): ParseResult {
  // Detect legacy "/" format: line-per-booster with slashes and no labels.
  const sample = text.split(/\r?\n/).find(l => l.trim().length > 0) || "";
  if (sample.includes("/") && !/^\s*[a-záéíóúñ ]+\s*:/i.test(sample)) {
    return { rows: [], errors: [{
      where: "txt",
      message: "Formato antiguo (Nombre / Rareza / Usos / Máx) ya no soportado. Usa bloques con etiquetas: ID:, Tipo:, Rareza:, etc.",
      raw: sample,
    }] };
  }

  // Split by one or more blank lines.
  const blocks = text.split(/\r?\n\s*\r?\n+/).map(b => b.trim()).filter(Boolean);
  const rows: ParsedBooster[] = [];
  const errors: ParseError[] = [];

  blocks.forEach((block, bi) => {
    const draft: any = {};
    const lines = block.split(/\r?\n/);
    for (const lineRaw of lines) {
      const line = lineRaw.trim();
      if (!line) continue;
      const m = line.match(/^([^:]+):\s*(.*)$/);
      if (!m) continue;
      const labelKey = normKey(m[1]);
      const key = TXT_LABELS[labelKey];
      if (!key) continue;
      const val = m[2].trim();
      // Multi-line "Efecto" not supported here; assume single line per label per spec.
      draft[key] = (draft[key] ? draft[key] + " " : "") + val;
    }
    const built = buildRow(draft, `Bloque ${bi + 1}`, errors);
    if (built) rows.push(built);
  });

  return { rows, errors };
}

/* ----------- Builder + validator ----------- */

function buildRow(draft: any, where: string, errors: ParseError[]): ParsedBooster | null {
  const name = clean(draft.name);
  const tipo = clean(draft.tipo);
  const efecto = clean(draft.efecto);
  const rarity = rarityFrom(draft.rarity);
  const external_id = clean(draft.external_id) || null;

  const missing: string[] = [];
  if (!external_id) missing.push("ID");
  if (!tipo) missing.push("Tipo");
  if (!rarity) missing.push("Rareza");
  if (!name) missing.push("Nombre");
  if (!efecto) missing.push("Efecto/Condición");

  if (missing.length) {
    errors.push({ where, message: `Faltan campos: ${missing.join(", ")}` });
    return null;
  }
  return {
    external_id,
    tipo: tipo || null,
    rarity: rarity!,
    name,
    modo_lanzamiento: clean(draft.modo_lanzamiento) || null,
    distancia: clean(draft.distancia) || null,
    objetivos: clean(draft.objetivos) || null,
    dados: clean(draft.dados) || null,
    efecto,
  };
}

/* ----------- File dispatch ----------- */

export async function parseBoosterFile(file: File): Promise<ParseResult> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    return parseXlsx(buf);
  }
  if (lower.endsWith(".txt")) {
    return parseTxt(await file.text());
  }
  return { rows: [], errors: [{ where: file.name, message: "Formato no soportado. Usa .xlsx o .txt" }] };
}
