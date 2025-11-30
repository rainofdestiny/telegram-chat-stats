// src/lib/telegram.ts
import { RawMessage, ParsedMessage } from "../types";

/* ======================= helpers ======================= */

const BOT_SUFFIXES = ["bot", "бот"];

function looksLikeBot(name?: string): boolean {
  if (!name) return false;
  const s = String(name).trim().toLowerCase();
  return BOT_SUFFIXES.some((suf) => s.endsWith(suf));
}

function isUserId(id?: string): boolean {
  return !!id && id.startsWith("user");
}

function isForwarded(raw: any): boolean {
  return !!(raw?.forwarded_from || raw?.saved_from);
}

function isService(raw: any): boolean {
  return raw?.type !== "message";
}

function normalizeText(text: any): string {
  if (typeof text === "string") return text.trim();
  if (Array.isArray(text)) {
    return text
      .map((t) => (typeof t === "string" ? t : (t?.text ?? "")))
      .join("")
      .trim();
  }
  return "";
}

function normalizeReactions(raw: any): Record<string, number> {
  const r = raw?.reactions;
  if (!r) return {};
  if (Array.isArray(r)) {
    // Telegram Desktop export: [{ emoji, count, ... }]
    const acc: Record<string, number> = {};
    for (const item of r) {
      const e = item?.emoji;
      const c = Number(item?.count ?? 0);
      if (e) acc[e] = (acc[e] ?? 0) + c;
    }
    return acc;
  }
  // already Record<string, number>
  if (typeof r === "object") return { ...(r as Record<string, number>) };
  return {};
}

/** Глобальный предикат допуска сообщения (по raw) */
function allowRawMessage(raw: any): boolean {
  if (isService(raw)) return false; // только type==="message"
  if (isForwarded(raw)) return false; // без пересланных
  const fromId: string | undefined = raw?.from_id;
  const fromName: string | undefined = raw?.from;
  // только люди: user…; любое channel… — вон
  if (!isUserId(fromId)) return false;
  // боты по нику
  if (looksLikeBot(fromName)) return false;
  return true;
}

/* ======================= core ======================= */

export function parseMessages(messages: RawMessage[]): ParsedMessage[] {
  // Пропускаем только валидные человеческие сообщения
  const filtered = (messages as any[]).filter(allowRawMessage);

  // Для актуального имени по user_id соберём последнюю метку времени
  const latestNameByUser: Record<string, { name: string; iso: string }> = {};

  const parsed: ParsedMessage[] = filtered.map((m: any) => {
    const text = normalizeText(m.text);
    const reactions = normalizeReactions(m);
    const fullDateISO = new Date(m.date).toISOString();
    const total = Object.values(reactions).reduce((a, b) => a + b, 0);

    const pm: ParsedMessage = {
      id: Number(m.id),
      from: typeof m.from === "string" ? m.from : "",
      from_id: m.from_id,
      text,
      date: m.date,
      reactions,
      reply_to_message_id: m.reply_to_message_id,
      media_type: m.media_type,
      fullDateISO,
      total,
    };

    // Обновим последнее имя по user_id
    const uid = pm.from_id!;
    const rec = latestNameByUser[uid];
    if (!rec || fullDateISO > rec.iso) {
      latestNameByUser[uid] = { name: pm.from, iso: fullDateISO };
    }

    return pm;
  });

  // Подставим актуальные имена туда, где пусто или устарело
  for (const msg of parsed) {
    const uid = msg.from_id!;
    const rec = latestNameByUser[uid];
    if (rec && rec.name && msg.from !== rec.name) {
      msg.from = rec.name;
    }
  }

  return parsed;
}

/** Проверка уже на ParsedMessage, лишнее не пройдёт после parseMessages */
export function isHumanAuthor(m: ParsedMessage): boolean {
  if (!isUserId(m.from_id)) return false;
  if (looksLikeBot(m.from)) return false;
  return true;
}
