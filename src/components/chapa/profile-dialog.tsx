"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api, fileToDataUrl, type Profile } from "@/lib/api";

export function ProfileDialog({
  open,
  onOpenChange,
  profile,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: Profile | null;
  onSaved: (p: Profile) => void;
}) {
  const [p, setP] = useState<Profile>(profile ?? {});
  const [busy, setBusy] = useState(false);

  function set<K extends keyof Profile>(k: K, v: Profile[K]) {
    setP((x) => ({ ...x, [k]: v }));
  }

  async function save() {
    setBusy(true);
    try {
      const saved = await api<Profile>("/api/profile", { method: "PUT", body: JSON.stringify(p) });
      onSaved(saved);
      onOpenChange(false);
      toast.success("Perfil guardado — o coach ficou mais inteligente para ti 🧠");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3.5 * 1024 * 1024) {
      toast.error("Foto até ~3.5MB");
      return;
    }
    set("photoDataUrl", await fileToDataUrl(file));
  }

  const field = "space-y-1 text-xs text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Teu perfil (o coach usa isto para tudo)</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <label className={`${field} col-span-2`}>
            Foto do teu avatar
            <input type="file" accept="image/*" onChange={pickPhoto} className="mt-1 text-sm" />
            {p.photoDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.photoDataUrl} alt="avatar" className="mt-2 size-16 rounded-full border-2 border-lime-500 object-cover" />
            )}
          </label>
          <label className={`${field} col-span-2`}>
            Nome
            <Input value={p.name ?? ""} onChange={(e) => set("name", e.target.value)} className="mt-1" />
          </label>
          <label className={field}>
            Idade
            <Input type="number" value={p.age ?? ""} onChange={(e) => set("age", Number(e.target.value))} className="mt-1" />
          </label>
          <label className={field}>
            Sexo
            <Input value={p.sex ?? ""} placeholder="M/F" onChange={(e) => set("sex", e.target.value)} className="mt-1" />
          </label>
          <label className={field}>
            Altura (cm)
            <Input type="number" value={p.heightCm ?? ""} onChange={(e) => set("heightCm", Number(e.target.value))} className="mt-1" />
          </label>
          <label className={field}>
            Peso (kg)
            <Input type="number" value={p.weightKg ?? ""} onChange={(e) => set("weightKg", Number(e.target.value))} className="mt-1" />
          </label>
          <label className={field}>
            Objetivo
            <Input value={p.goal ?? ""} placeholder="perder gordura / ganhar massa" onChange={(e) => set("goal", e.target.value)} className="mt-1" />
          </label>
          <label className={field}>
            Experiência
            <Input value={p.experience ?? ""} placeholder="iniciante/intermédio/avançado" onChange={(e) => set("experience", e.target.value)} className="mt-1" />
          </label>
          <label className={field}>
            Dias de treino/semana
            <Input type="number" min={1} max={7} value={p.daysPerWeek ?? ""} onChange={(e) => set("daysPerWeek", Number(e.target.value))} className="mt-1" />
          </label>
          <label className={field}>
            Estilo alimentar
            <Input value={p.dietStyle ?? ""} placeholder="omnívoro, pescetariano…" onChange={(e) => set("dietStyle", e.target.value)} className="mt-1" />
          </label>
          <label className={`${field} col-span-2`}>
            Equipamento disponível
            <Input value={(p.equipment ?? []).join(", ")} onChange={(e) => set("equipment", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} className="mt-1" />
          </label>
        </div>
        <Button onClick={save} disabled={busy} className="bg-lime-500 text-black hover:bg-lime-400">
          {busy ? "A guardar…" : "Guardar"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
