// src/components/sections/ReactionsTab.tsx
import React, { useMemo, useState } from "react";
import ReactionsChart from "../reactions/ReactionsChart";
import TopEmojisTable from "../reactions/TopEmojisTable";
import TopReactionAuthorsTable from "../reactions/TopReactionAuthorsTable";
import TopReactionMessagesTable from "../reactions/TopReactionMessagesTable";
import { buildTopAuthorsByReactions } from "../../lib/stats";
import type { ParsedMessage, Row } from "../../types";
import {
  pageSlice,
  reactionsMapClassic,
  totalReactionsClassic,
} from "../../lib/helpers";

export default function ReactionsTab({
  humans,
  chatSlug,
}: {
  humans: ParsedMessage[];
  chatSlug: string;
}) {
  // 📈 Динамика реакций по дням (классические реакции)
  const reactDaily = useMemo(() => {
    const map = new Map<string, number>();
    humans.forEach((m) => {
      const d = m.fullDateISO.slice(0, 10);
      map.set(d, (map.get(d) ?? 0) + totalReactionsClassic(m.reactions as any));
    });
    return Array.from(map.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [humans]);

  // Суммарные счётчики эмодзи (только классические)
  const emojiCountsAll = useMemo(() => {
    const cnt: Record<string, number> = {};
    humans.forEach((m) => {
      const r = reactionsMapClassic(m.reactions as any);
      for (const k of Object.keys(r)) cnt[k] = (cnt[k] ?? 0) + r[k];
    });
    return Object.entries(cnt)
      .map(([emoji, count]) => ({ emoji, count }))
      .sort((a, b) => b.count - a.count);
  }, [humans]);

  // Порядок эмодзи в блоке под заголовком — по популярности (убывание)
  const emojiOrder = useMemo(
    () => emojiCountsAll.map((e) => e.emoji),
    [emojiCountsAll],
  );

  // Пагинация таблицы «Популярные эмодзи»
  const [emojiPage, setEmojiPage] = useState(0);
  const emojiPageSize = 10;
  const emojiTopPaged = useMemo(
    () =>
      pageSlice(emojiCountsAll, emojiPage, emojiPageSize).map(
        (e: { emoji: string; count: number }, i: number) => ({
          rank: emojiPage * emojiPageSize + i + 1,
          emoji: e.emoji,
          count: e.count,
        }),
      ),
    [emojiCountsAll, emojiPage],
  );

  // 👥 Авторы по реакциям
  const reactAuthorsAll = useMemo(
    () => buildTopAuthorsByReactions(humans, 10_000),
    [humans],
  );
  const [reactAuthorPage, setReactAuthorPage] = useState(0);
  const reactAuthorPageSize = 10;
  const reactAuthorsPaged: Row[] = useMemo(
    () =>
      pageSlice(reactAuthorsAll, reactAuthorPage, reactAuthorPageSize).map(
        (r: Row, i: number) => ({
          rank: reactAuthorPage * reactAuthorPageSize + i + 1,
          from: r.from,
          reactions: r.reactions ?? 0,
        }),
      ),
    [reactAuthorsAll, reactAuthorPage],
  );

  // 😁 Топ сообщений по реакциям (фильтр по выбранным эмодзи)
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const toggleEmoji = (e: string) =>
    setSelectedEmojis((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e],
    );
  const clearEmojis = () => setSelectedEmojis([]);

  const reactMsgsAll = useMemo(() => {
    const filtered = humans.filter((m) => {
      if (selectedEmojis.length === 0) return true;
      const r = reactionsMapClassic(m.reactions as any);
      return selectedEmojis.some((e) => (r[e] ?? 0) > 0);
    });
    return filtered
      .map((m) => ({
        id: (m as any).id as number,
        from: m.from,
        text: m.text ?? "",
        reactions: totalReactionsClassic(m.reactions as any),
      }))
      .sort((a, b) => b.reactions - a.reactions);
  }, [humans, selectedEmojis]);

  const [reactMsgPage, setReactMsgPage] = useState(0);
  const reactMsgPageSize = 10;
  const reactMsgsPaged = useMemo(
    () =>
      pageSlice(reactMsgsAll, reactMsgPage, reactMsgPageSize).map(
        (
          m: { id: number; from: string; text: string; reactions: number },
          i: number,
        ) => ({
          rank: reactMsgPage * reactMsgPageSize + i + 1,
          ...m,
        }),
      ),
    [reactMsgsAll, reactMsgPage],
  );

  return (
    <>
      {/* 📈 Динамика реакций */}
      <ReactionsChart data={reactDaily} />

      {/* Ряд: эмодзи и авторы по реакциям */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 😊 Популярные эмодзи */}
        <div className="card relative bg-gradient-to-br from-[#111122] to-[#0a0a15] shadow-lg shadow-purple-500/20">
          <div className="flex justify-between items-center mb-3">
            <div className="hdr">😊 Популярные эмодзи</div>
            {emojiCountsAll.length > emojiPageSize && (
              <div className="flex gap-2">
                <button
                  disabled={emojiPage === 0}
                  onClick={() => setEmojiPage((p) => Math.max(0, p - 1))}
                  className="px-3 py-1 bg-slate-700 rounded-full hover:bg-purple-600 focus:ring-2 focus:ring-purple-500 disabled:opacity-40"
                >
                  ←
                </button>
                <button
                  disabled={
                    (emojiPage + 1) * emojiPageSize >= emojiCountsAll.length
                  }
                  onClick={() =>
                    setEmojiPage((p) =>
                      (p + 1) * emojiPageSize >= emojiCountsAll.length
                        ? p
                        : p + 1,
                    )
                  }
                  className="px-3 py-1 bg-slate-700 rounded-full hover:bg-purple-600 focus:ring-2 focus:ring-purple-500 disabled:opacity-40"
                >
                  →
                </button>
              </div>
            )}
          </div>
          <TopEmojisTable rows={emojiTopPaged as any} />
        </div>

        {/* 👥 Авторы с наибольшим количеством реакций */}
        <div className="card relative bg-gradient-to-br from-[#111122] to-[#0a0a15] shadow-lg shadow-purple-500/20">
          <div className="flex justify-between items-center mb-3">
            <div className="hdr">
              👥 Авторы с наибольшим количеством реакций
            </div>
            {reactAuthorsAll.length > reactAuthorPageSize && (
              <div className="flex gap-2">
                <button
                  disabled={reactAuthorPage === 0}
                  onClick={() => setReactAuthorPage((p) => Math.max(0, p - 1))}
                  className="px-3 py-1 bg-slate-700 rounded-full hover:bg-purple-600 focus:ring-2 focus:ring-purple-500 disabled:opacity-40"
                >
                  ←
                </button>
                <button
                  disabled={
                    (reactAuthorPage + 1) * reactAuthorPageSize >=
                    reactAuthorsAll.length
                  }
                  onClick={() =>
                    setReactAuthorPage((p) =>
                      (p + 1) * reactAuthorPageSize >= reactAuthorsAll.length
                        ? p
                        : p + 1,
                    )
                  }
                  className="px-3 py-1 bg-slate-700 rounded-full hover:bg-purple-600 focus:ring-2 focus:ring-purple-500 disabled:opacity-40"
                >
                  →
                </button>
              </div>
            )}
          </div>
          <TopReactionAuthorsTable rows={reactAuthorsPaged as any} />
        </div>
      </div>

      {/* 😁 Топ сообщений по реакциям — заголовок + стрелки → блок эмодзи → таблица */}
      <div className="card relative bg-gradient-to-br from-[#111122] to-[#0a0a15] shadow-lg shadow-purple-500/20">
        {/* Заголовок + стрелки справа */}
        <div className="flex justify-between items-center mb-3">
          <div className="hdr">😁 Топ сообщений по реакциям</div>
          {reactMsgsAll.length > reactMsgPageSize && (
            <div className="flex gap-2">
              <button
                disabled={reactMsgPage === 0}
                onClick={() => setReactMsgPage((p) => Math.max(0, p - 1))}
                className="px-3 py-1 bg-slate-700 rounded-full hover:bg-purple-600 focus:ring-2 focus:ring-purple-500 disabled:opacity-40"
                aria-label="Назад"
              >
                ←
              </button>
              <button
                disabled={
                  (reactMsgPage + 1) * reactMsgPageSize >= reactMsgsAll.length
                }
                onClick={() =>
                  setReactMsgPage((p) =>
                    (p + 1) * reactMsgPageSize >= reactMsgsAll.length
                      ? p
                      : p + 1,
                  )
                }
                className="px-3 py-1 bg-slate-700 rounded-full hover:bg-purple-600 focus:ring-2 focus:ring-purple-500 disabled:opacity-40"
                aria-label="Вперед"
              >
                →
              </button>
            </div>
          )}
        </div>

        {/* Блок эмодзи (по популярности) под заголовком */}
        <div className="flex flex-wrap gap-2 mb-4">
          {emojiOrder.map((e) => {
            const active = selectedEmojis.includes(e);
            return (
              <button
                key={e}
                onClick={() => toggleEmoji(e)}
                className={`px-2 py-1 rounded-full border border-slate-700 ${active ? "bg-purple-600" : "bg-slate-700 hover:bg-purple-500"
                  } transition`}
                title={e}
              >
                {e}
              </button>
            );
          })}
          {selectedEmojis.length > 0 && (
            <button
              onClick={clearEmojis}
              className="px-2 py-1 rounded-full border border-slate-700 bg-slate-800 hover:bg-slate-700"
              title="Сбросить фильтр"
            >
              Сбросить
            </button>
          )}
        </div>

        {/* Таблица */}
        <TopReactionMessagesTable
          rows={reactMsgsPaged as any}
          chatSlug={chatSlug}
        />
      </div>
    </>
  );
}
