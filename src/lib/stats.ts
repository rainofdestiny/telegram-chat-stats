import { ParsedMessage, Row, Node, Link } from "../types";

/**
 * NOTE: All functions in this module expect an array of *already filtered* messages.
 * The caller (App.tsx) is responsible for filtering out bots/channels via `isHumanAuthor`.
 */

/* ======================= tops ======================= */

export function buildTopAuthors(messages: ParsedMessage[], limit = 10): Row[] {
  const countsByUser: Record<string, number> = {};
  const latestNameByUser: Record<string, { name: string; iso: string }> = {};

  for (const m of messages) {
    const uid = m.from_id!;
    countsByUser[uid] = (countsByUser[uid] ?? 0) + 1;
    const rec = latestNameByUser[uid];
    if (!rec || m.fullDateISO > rec.iso) {
      latestNameByUser[uid] = { name: m.from, iso: m.fullDateISO };
    }
  }

  return Object.entries(countsByUser)
    .map(([uid, count]) => ({
      uid,
      from: latestNameByUser[uid]?.name || "",
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((e, idx) => ({ rank: idx + 1, from: e.from, count: e.count }));
}

export function buildTopMessages(messages: ParsedMessage[], limit = 10): Row[] {
  const rows = messages
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
    .map((m, idx) => ({
      rank: idx + 1,
      from: m.from,
      text: m.text || "(без текста)",
      reactions: m.total,
    }));
  return rows;
}

export function buildTopAuthorsByReactions(
  messages: ParsedMessage[],
  limit = 20,
): Row[] {
  const sumByUser: Record<string, number> = {};
  const latestNameByUser: Record<string, { name: string; iso: string }> = {};

  for (const m of messages) {
    const uid = m.from_id!;
    sumByUser[uid] = (sumByUser[uid] ?? 0) + m.total;
    const rec = latestNameByUser[uid];
    if (!rec || m.fullDateISO > rec.iso) {
      latestNameByUser[uid] = { name: m.from, iso: m.fullDateISO };
    }
  }

  return Object.entries(sumByUser)
    .map(([uid, total]) => ({
      uid,
      from: latestNameByUser[uid]?.name || "",
      reactions: total,
    }))
    .sort((a, b) => b.reactions - a.reactions)
    .slice(0, limit)
    .map((e, idx) => ({ rank: idx + 1, from: e.from, reactions: e.reactions }));
}

/* ======================= activity ======================= */

export function buildHourWeekdayHeatmap(messages: ParsedMessage[]) {
  const heat: { weekday: number; hour: number; count: number }[] = [];

  for (const m of messages) {
    const d = new Date(m.fullDateISO);
    const weekday = (d.getDay() + 6) % 7; // 0=Mon … 6=Sun
    const hour = d.getHours();
    const found = heat.find((h) => h.weekday === weekday && h.hour === hour);
    if (found) found.count++;
    else heat.push({ weekday, hour, count: 1 });
  }

  return heat;
}

export function buildDailyChart(messages: ParsedMessage[]) {
  const counts: Record<string, number> = {};
  for (const m of messages) {
    const date = m.fullDateISO.slice(0, 10);
    counts[date] = (counts[date] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date > b.date ? 1 : -1));
}

export function buildWeeklyTrend(messages: ParsedMessage[]) {
  const counts: Record<string, number> = {};
  for (const m of messages) {
    const d = new Date(m.fullDateISO);
    const y = d.getFullYear();
    const w = getWeekNumber(d);
    const key = `${y}-W${w.toString().padStart(2, "0")}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([week, count]) => ({ week, count }))
    .sort((a, b) => (a.week > b.week ? 1 : -1));
}

function getWeekNumber(d: Date) {
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.floor((+d - +oneJan) / dayMs);
  return Math.ceil((d.getDay() + 1 + days) / 7);
}

/* ======================= reply graph ======================= */

export function buildReplyGraph(messages: ParsedMessage[]): {
  nodes: Node[];
  links: Link[];
} {
  // Соберём индекс по id, только по людям
  const byId: Record<number, ParsedMessage> = {};
  const latestNameByUser: Record<string, { name: string; iso: string }> = {};
  for (const m of messages) {
    byId[m.id] = m;
    const uid = m.from_id!;
    const rec = latestNameByUser[uid];
    if (!rec || m.fullDateISO > rec.iso) {
      latestNameByUser[uid] = { name: m.from, iso: m.fullDateISO };
    }
  }

  const nodeSeen = new Set<string>();
  const nodes: Node[] = [];
  const linkWeights: Record<string, number> = {};

  for (const m of messages) {
    const src = m.from_id!;
    if (!nodeSeen.has(src)) {
      nodes.push({ id: src, name: latestNameByUser[src]?.name || "" });
      nodeSeen.add(src);
    }

    const replyTo = m.reply_to_message_id;
    if (!replyTo) continue;

    const target = byId[replyTo];
    if (!target) continue;
    const dst = target.from_id!;
    if (src === dst) continue;

    const key = `${src}→${dst}`;
    linkWeights[key] = (linkWeights[key] ?? 0) + 1;
  }

  const links: Link[] = Object.entries(linkWeights).map(([k, value]) => {
    const [source, target] = k.split("→");
    return { source, target, value };
  });

  return { nodes, links };
}
