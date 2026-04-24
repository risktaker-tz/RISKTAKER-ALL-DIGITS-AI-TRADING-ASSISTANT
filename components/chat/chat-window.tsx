"use client";

import { useEffect, useState } from "react";
import { Mic, Phone, SendHorizonal, VideoIcon } from "lucide-react";

type ChatWindowProps = {
  unlocked: boolean;
};

const seedMessages = [
  { id: "1", sender: "them", body: "The teaser clip looks strong. Want to talk tonight?" },
  { id: "2", sender: "you", body: "Yes. TUCHATI is live, so call me when you are ready." }
];

export function ChatWindow({ unlocked }: ChatWindowProps) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(seedMessages);
  const [isOnline, setIsOnline] = useState(true);
  const canSend = unlocked && draft.trim().length > 0;

  useEffect(() => {
    const sync = () => setIsOnline(window.navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const indicator = !unlocked ? "Mutual follow required" : isOnline ? "Online" : "Offline fallback available";

  return (
    <section className="rounded-[32px] border border-white/15 bg-white/8 p-5 shadow-glass backdrop-blur">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">Private thread</p>
          <p className="text-sm text-slate-300">{indicator}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!unlocked}
            className="rounded-full border border-white/15 p-3 disabled:opacity-40"
          >
            <Phone className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={!unlocked}
            className="rounded-full border border-white/15 p-3 disabled:opacity-40"
          >
            <VideoIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[80%] rounded-3xl px-4 py-3 text-sm ${
              message.sender === "you"
                ? "ml-auto bg-coral text-white"
                : "bg-white/10 text-slate-100"
            }`}
          >
            {message.body}
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          disabled={!unlocked}
          className="rounded-full border border-white/15 p-3 disabled:opacity-40"
        >
          <Mic className="h-4 w-4" />
        </button>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={unlocked ? "Write a message..." : "Follow each other to chat"}
          disabled={!unlocked}
          className="flex-1 rounded-full border border-white/15 bg-slate-950/30 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400 disabled:opacity-50"
        />
        <button
          type="button"
          disabled={!canSend}
          onClick={() => {
            setMessages((current) => [...current, { id: crypto.randomUUID(), sender: "you", body: draft }]);
            setDraft("");
          }}
          className="rounded-full bg-cyan p-3 text-ink disabled:opacity-40"
        >
          <SendHorizonal className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
