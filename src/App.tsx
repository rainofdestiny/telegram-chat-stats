import React, { useMemo, useState } from "react";
import FileDrop from "./components/FileDrop";
import Tabs from "./components/Tabs";

// секции
import ActivityTab from "./components/sections/ActivityTab";
import TopsTab from "./components/sections/TopsTab";
import ContentTab from "./components/sections/ContentTab";
import ReactionsTab from "./components/sections/ReactionsTab";
import SocialTab from "./components/sections/SocialTab";

import { parseMessages } from "./lib/telegram";
import type { RawMessage, ParsedMessage } from "./types";

export default function App() {
  const [raw, setRaw] = useState<RawMessage[]>([]);
  const [chatSlug, setChatSlug] = useState("");

  // DnD JSON
  const onJSON = (data: unknown) => {
    const msgs = Array.isArray((data as any)?.messages)
      ? ((data as any).messages as RawMessage[])
      : [];
    setRaw(msgs);
  };

  const humans: ParsedMessage[] = useMemo(() => parseMessages(raw), [raw]);

  const [tab, setTab] = useState<
    "activity" | "tops" | "content" | "reactions" | "social"
  >("activity");

  return (
    <div className="min-h-screen bg-[#050510] text-white">
      <div className="container py-6 space-y-6">
        <header className="flex justify-center items-center">
          <h1 className="text-3xl font-bold text-purple-400 drop-shadow-lg">
            Telegram Stats
          </h1>
        </header>

        <FileDrop onJSON={onJSON} />

        {humans.length > 0 && (
          <div className="card bg-gradient-to-br from-[#111122] to-[#0a0a15] shadow-lg shadow-purple-500/20">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between gap-4 flex-wrap">
                <div className="hdr">⚙️ Навигация</div>
                <Tabs
                  tabs={[
                    { key: "activity", label: "Активность" },
                    { key: "tops", label: "Топы" },
                    { key: "content", label: "Контент" },
                    { key: "reactions", label: "Реакции" },
                    { key: "social", label: "Соц. динамика" },
                  ]}
                  value={tab}
                  onChange={(k) => setTab(k as any)}
                />
              </div>

              <div>
                <label className="lbl">Чат для ссылок (slug)</label>
                <input
                  value={chatSlug}
                  onChange={(e) => setChatSlug(e.target.value.trim())}
                  placeholder="например: horny_alice"
                  className="mt-1 w-full border rounded-lg px-3 py-2 bg-[#050510] border-slate-700 text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
        )}

        {humans.length > 0 && tab === "activity" && (
          <ActivityTab humans={humans} />
        )}
        {humans.length > 0 && tab === "tops" && (
          <TopsTab humans={humans} chatSlug={chatSlug} />
        )}
        {humans.length > 0 && tab === "content" && (
          <ContentTab humans={humans} chatSlug={chatSlug} />
        )}
        {humans.length > 0 && tab === "reactions" && (
          <ReactionsTab humans={humans} chatSlug={chatSlug} />
        )}
        {humans.length > 0 && tab === "social" && <SocialTab humans={humans} />}

        <footer className="text-center text-xs text-gray-500 pt-6">
          Все данные обрабатываются локально в браузере
        </footer>
      </div>
    </div>
  );
}
