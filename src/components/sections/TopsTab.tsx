import React, { useMemo, useState } from "react";
import TopAuthorsTable from "../TopAuthorsTable";
import TopMessagesTable from "../TopMessagesTable";
import { buildTopAuthors } from "../../lib/stats";
import type { ParsedMessage, Row } from "../../types";
import { pageSlice, totalReactions, reactionsMap } from "../../lib/helpers";

export default function TopsTab({
  humans,
  chatSlug,
}: {
  humans: ParsedMessage[];
  chatSlug: string;
}) {
  const topAuthorsAll = useMemo(
    () => buildTopAuthors(humans, 10_000),
    [humans],
  );

  const [authorPage, setAuthorPage] = useState(0);
  const pageSizeAuthors = 10;
  const topAuthorsPaged: Row[] = useMemo(
    () =>
      pageSlice(topAuthorsAll, authorPage, pageSizeAuthors).map(
        (r: Row, i: number) => ({
          rank: authorPage * pageSizeAuthors + i + 1,
          from: r.from,
          count: r.count ?? 0,
        }),
      ),
    [topAuthorsAll, authorPage],
  );

  const sortedByReactions = useMemo(
    () =>
      [...humans].sort(
        (a, b) =>
          totalReactions(reactionsMap(b.reactions)) -
          totalReactions(reactionsMap(a.reactions)),
      ),
    [humans],
  );

  type MessageRow = Row & { id?: number };
  const [msgPage, setMsgPage] = useState(0);
  const pageSizeMsgs = 10;
  const topMessagesPaged: MessageRow[] = useMemo(
    () =>
      pageSlice(sortedByReactions, msgPage, pageSizeMsgs).map(
        (m: ParsedMessage, i: number) => ({
          rank: msgPage * pageSizeMsgs + i + 1,
          id: (m as any).id as number,
          from: m.from,
          text: m.text ?? "",
          reactions: totalReactions(reactionsMap(m.reactions)),
        }),
      ),
    [sortedByReactions, msgPage],
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* слева — авторы (таблица -> card тут) */}
      <div className="card relative bg-gradient-to-br from-[#111122] to-[#0a0a15] shadow-lg shadow-purple-500/20">
        <div className="flex justify-between items-center mb-3">
          <div className="hdr">👤 Топ авторов</div>
          {topAuthorsAll.length > pageSizeAuthors && (
            <div className="flex gap-2">
              <button
                disabled={authorPage === 0}
                onClick={() => setAuthorPage((p) => Math.max(0, p - 1))}
                className="px-3 py-1 bg-slate-700 rounded-full hover:bg-purple-600 focus:ring-2 focus:ring-purple-500 disabled:opacity-40"
              >
                ←
              </button>
              <button
                disabled={
                  (authorPage + 1) * pageSizeAuthors >= topAuthorsAll.length
                }
                onClick={() =>
                  setAuthorPage((p) =>
                    (p + 1) * pageSizeAuthors >= topAuthorsAll.length
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
        <TopAuthorsTable rows={topAuthorsPaged as unknown as any} />
      </div>

      {/* справа — сообщения (таблица -> card тут) */}
      <div className="card relative bg-gradient-to-br from-[#111122] to-[#0a0a15] shadow-lg shadow-purple-500/20">
        <div className="flex justify-between items-center mb-3">
          <div className="hdr">🔥 Топ сообщений</div>
          {sortedByReactions.length > pageSizeMsgs && (
            <div className="flex gap-2">
              <button
                disabled={msgPage === 0}
                onClick={() => setMsgPage((p) => Math.max(0, p - 1))}
                className="px-3 py-1 bg-slate-700 rounded-full hover:bg-purple-600 focus:ring-2 focus:ring-purple-500 disabled:opacity-40"
              >
                ←
              </button>
              <button
                disabled={
                  (msgPage + 1) * pageSizeMsgs >= sortedByReactions.length
                }
                onClick={() =>
                  setMsgPage((p) =>
                    (p + 1) * pageSizeMsgs >= sortedByReactions.length
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
        <TopMessagesTable rows={topMessagesPaged as any} chatSlug={chatSlug} />
      </div>
    </div>
  );
}
