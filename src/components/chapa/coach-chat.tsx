"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, streamChat, type ChatMsg } from "@/lib/api";

export function CoachChat({ greeting }: { greeting?: string }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<ChatMsg[]>("/api/coach/chat").then(setMsgs).catch(() => {});
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      await streamChat(text, (chunk) => {
        setMsgs((m) => {
          const copy = [...m];
          copy[copy.length - 1] = {
            role: "assistant",
            content: copy[copy.length - 1].content + chunk,
          };
          return copy;
        });
      });
    } catch {
      setMsgs((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: "⚠️ Falha a falar com a IA. Tenta de novo." };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }

  const empty = msgs.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {empty && (
          <p className="pt-8 text-center text-sm text-muted-foreground">
            {greeting ?? "Pergunta-me o que quiseres: histórico, receitas, treino, suplementos… 💬"}
          </p>
        )}
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              m.role === "user"
                ? "ml-auto rounded-br-sm bg-lime-500 text-black"
                : "mr-auto rounded-bl-sm bg-muted"
            }`}
          >
            {m.content || "…"}
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <div className="flex gap-2 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Pergunta ao teu coach…"
          disabled={busy}
        />
        <Button onClick={send} disabled={busy || !input.trim()} className="bg-lime-500 text-black hover:bg-lime-400">
          Enviar
        </Button>
      </div>
    </div>
  );
}
