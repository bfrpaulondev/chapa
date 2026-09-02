"use client";

import { useEffect, useState } from "react";
import { CoachChat } from "@/components/chapa/coach-chat";
import { CoachAvatar } from "@/components/chapa/avatar";
import { ProfileDialog } from "@/components/chapa/profile-dialog";
import { BodyScreen, NutritionScreen, TodayScreen, WorkoutScreen } from "@/components/chapa/screens";
import { api, type Profile } from "@/lib/api";

const TABS = [
  { id: "hoje", icon: "⚡", label: "Hoje" },
  { id: "treino", icon: "🏋️", label: "Treino" },
  { id: "nutri", icon: "🍽️", label: "Nutri" },
  { id: "corpo", icon: "📷", label: "Corpo" },
  { id: "coach", icon: "💬", label: "Coach" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function Home() {
  const [tab, setTab] = useState<TabId>("hoje");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    api<Profile | null>("/api/profile")
      .then((p) => {
        setProfile(p);
        if (!p?.onboarded) setProfileOpen(true);
      })
      .catch(() => {});
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <div className="mx-auto flex h-dvh max-w-lg flex-col">
      <header className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <h1 className="text-xl font-bold tracking-tight">
          CHAPA<span className="text-lime-500">.</span>
        </h1>
        <button
          onClick={() => setProfileOpen(true)}
          className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-sm"
          aria-label="Perfil"
        >
          {profile?.photoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photoDataUrl} alt="perfil" className="size-full object-cover" />
          ) : (
            "👤"
          )}
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-24">
        {tab === "hoje" && <TodayScreen />}
        {tab === "treino" && <WorkoutScreen />}
        {tab === "nutri" && <NutritionScreen />}
        {tab === "corpo" && <BodyScreen />}
        {tab === "coach" && (
          <div className="-mx-4 h-[calc(100%-1rem)]">
            <CoachChat />
          </div>
        )}
      </main>

      <CoachAvatar screen={tab} profile={profile} />

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-lg justify-around border-t bg-background/90 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] transition-colors ${
              tab === t.id ? "text-lime-500" : "text-muted-foreground"
            }`}
          >
            <span className="text-xl leading-none">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} profile={profile} onSaved={setProfile} />
    </div>
  );
}
