// src/lib/helpers.ts

/** ===================== ПАГИНАЦИЯ ===================== */
export const pageSlice = <T>(arr: T[], page: number, size: number): T[] =>
  arr.slice(page * size, (page + 1) * size);

/** ===================== РЕАКЦИИ ===================== */
/** Агрегатор ВСЕХ реакций (и unicode-эмодзи, и кастомных) */
export function reactionsMap(r: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!r) return out;

  if (!Array.isArray(r)) {
    for (const [k, v] of Object.entries(r as Record<string, number>)) {
      out[k] = Number(v) || 0;
    }
    return out;
  }

  for (const it of r as any[]) {
    const type = it?.type as string | undefined;
    const count = Number(it?.count) || 0;

    if (type === "emoji" && typeof it?.emoji === "string" && it.emoji.length) {
      out[it.emoji] = (out[it.emoji] ?? 0) + count;
    } else if (type === "custom_emoji") {
      // Совместимость: если где-то показываем «Premium Emoji …»
      const base =
        (it?.document_id as string | undefined) ??
        (it?.custom_emoji_id as string | undefined) ??
        "unknown";
      const name = (base.split("/").pop() || base).replace(/\.[^.]+$/, "");
      const key = `Premium Emoji ${name}`;
      out[key] = (out[key] ?? 0) + count;
    }
  }
  return out;
}

/** Только КЛАССИЧЕСКИЕ реакции (unicode-эмодзи). Кастомные исключаются. */
export function reactionsMapClassic(r: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!r) return out;
  if (!Array.isArray(r)) {
    for (const [k, v] of Object.entries(r as Record<string, number>)) {
      // грубый фильтр «похоже на эмодзи»
      if (/\p{Emoji}/u.test(k)) out[k] = Number(v) || 0;
    }
    return out;
  }
  for (const it of r as any[]) {
    if (it?.type === "emoji" && typeof it?.emoji === "string" && it.emoji) {
      const count = Number(it?.count) || 0;
      out[it.emoji] = (out[it.emoji] ?? 0) + count;
    }
  }
  return out;
}

/** Сумма всех реакций (unicode+custom) */
export function totalReactions(
  reactions?: Record<string, number> | unknown[],
): number {
  if (!reactions) return 0;
  if (Array.isArray(reactions)) {
    return (reactions as any[]).reduce(
      (s, it) => s + (Number((it as any)?.count) || 0),
      0,
    );
  }
  return Object.values(reactions).reduce((a, b) => a + (Number(b) || 0), 0);
}

/** Сумма ТОЛЬКО классических реакций */
export function totalReactionsClassic(r?: unknown): number {
  const m = reactionsMapClassic(r);
  return Object.values(m).reduce((a, b) => a + (Number(b) || 0), 0);
}

/** ===================== ДАТЫ / НЕДЕЛИ ===================== */
/** Формат dd.mm.yyyy */
export function formatDateRU(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

/** Принимает ISO 'YYYY-MM-DD' или полный ISO 'YYYY-MM-DDTHH:mm:ss.sssZ' */
export function formatISODateRU(iso: string): string {
  const s = (iso || "").slice(0, 10); // YYYY-MM-DD
  const [y, m, d] = s.split("-").map((x) => Number(x));
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}.${y}`;
}

/** Начало недели (понедельник) в ISO-строке 'YYYY-MM-DD' из weekKey 'YYYY-Www' */
export function weekKeyStartISO(weekKey: string): string {
  // парсим YYYY-Www
  const m = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!m) return weekKey;
  const year = Number(m[1]);
  const week = Number(m[2]);

  // ISO: понедельник недели 1 — это понедельник той недели, где 4 января
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7; // 0=Mon..6=Sun
  const mondayW1 = new Date(jan4);
  mondayW1.setUTCDate(jan4.getUTCDate() - jan4Day); // понедельник первой ISO-недели

  const mondayW = new Date(mondayW1);
  mondayW.setUTCDate(mondayW1.getUTCDate() + (week - 1) * 7);

  const yyyy = mondayW.getUTCFullYear();
  const mm = String(mondayW.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(mondayW.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Красивый лейбл недели: старт недели в dd.mm.yyyy (или диапазон) */
export function formatWeekKeyRU(
  weekKey: string,
  mode: "start" | "range" = "start",
): string {
  const startISO = weekKeyStartISO(weekKey); // YYYY-MM-DD
  if (startISO.includes("W")) return weekKey; // если не распарсилось

  // старт
  const [y, m, d] = startISO.split("-").map((x) => Number(x));
  const start = new Date(Date.UTC(y, m - 1, d));
  if (mode === "start") return formatDateRU(start);

  // диапазон: Пн—Вс
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return `${formatDateRU(start)}–${formatDateRU(end)}`;
}

/** Универсальный форматтер тика оси X: день или неделя */
export function formatTickDateRU(s: string): string {
  if (!s) return s;
  return s.includes("-W") ? formatWeekKeyRU(s, "start") : formatISODateRU(s);
}

/** ===================== НЕДЕЛИ (ключи) ===================== */
export function weekStartISO(d: Date): string {
  const day = d.getDay();
  const diff = (day + 6) % 7;
  const start = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  start.setUTCDate(start.getUTCDate() - diff);
  const yyyy = start.getUTCFullYear();
  const mm = String(start.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(start.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function weekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
