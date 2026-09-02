"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, type Brief, type Profile } from "@/lib/api";
import { CoachChat } from "./coach-chat";

type Nudge = { time: string; message: string; kind: string };

export function CoachAvatar({ screen, profile }: { screen: string; profile: Profile | null }) {
  const [tip, setTip] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const nudgesRef = useRef<Nudge[]>([]);
  const firedRef = useRef<Set<string>>(new Set());

  // dica contextual ao mudar de ecrã (servidor faz cache por ecrã+dia)
  useEffect(() => {
    let alive = true;
    api<{ tip: string }>("/api/coach/tip", { method: "POST", body: JSON.stringify({ screen }) })
      .then((r) => {
        if (!alive) return;
        setTip(r.tip);
        const t = setTimeout(() => setTip((cur) => (cur === r.tip ? null : cur)), 9000);
        return () => clearTimeout(t);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [screen]);

  // avisos proativos: verifica os nudges do dia a cada 30s
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const loadBrief = () =>
      api<Brief>("/api/brief")
        .then((b) => {
          nudgesRef.current = b.nudges ?? [];
        })
        .catch(() => {});
    loadBrief();
    const briefTimer = setInterval(loadBrief, 10 * 60 * 1000); // refresca a cada 10min

    const tick = setInterval(() => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      for (const n of nudgesRef.current) {
        const id = `${today}:${n.time}`;
        if (n.time === hhmm && !firedRef.current.has(id)) {
          firedRef.current.add(id);
          try {
            localStorage.setItem("chapa-fired", JSON.stringify([...firedRef.current]));
          } catch {}
          setTip(n.message);
          setTimeout(() => setTip((cur) => (cur === n.message ? null : cur)), 12000);
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("CHAPA — teu coach 💪", { body: n.message });
          }
        }
      }
    }, 30 * 1000);

    try {
      const saved = JSON.parse(localStorage.getItem("chapa-fired") ?? "[]") as string[];
      firedRef.current = new Set(saved.filter((s) => s.startsWith(today)));
    } catch {}

    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    return () => {
      clearInterval(tick);
      clearInterval(briefTimer);
    };
  }, []);

  return (
    <>
      {/* dica flutuante */}
      {tip && !chatOpen && (
        <div className="pointer-events-none fixed right-16 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 max-w-[240px] animate-in fade-in slide-in-from-bottom-2 rounded-2xl rounded-br-sm border bg-card px-3.5 py-2.5 text-sm shadow-xl">
          {tip}
        </div>
      )}

      {/* avatar flutuante */}
      <button
        onClick={() => setChatOpen(true)}
        aria-label="Abrir coach IA"
        className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex size-14 items-center justify-center overflow-hidden rounded-full border-2 border-lime-500 bg-card shadow-xl transition-transform active:scale-90"
      >
        {profile?.photoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.photoDataUrl} alt="coach" className="size-full object-cover" />
        ) : (
          <span className="text-2xl">🤖</span>
        )}
        <span className="absolute -top-0.5 -right-0.5 size-3.5 animate-pulse rounded-full border-2 border-background bg-lime-500" />
      </button>

      {/* chat do coach */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="flex h-[85vh] flex-col p-0">
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle>💬 Coach CHAPA</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1">
            <CoachChat greeting="Fala comigo! Posso ver o teu histórico, dar receitas com o que tens em casa, ajustar treinos… tudo 💪" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
