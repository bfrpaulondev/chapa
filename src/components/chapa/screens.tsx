"use client";

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api, fileToDataUrl, type Brief, type Metric, type MealPlan, type Photo, type Supplement, type WorkoutPlan } from "@/lib/api";

function Md({ children }: { children: string }) {
  return (
    <div className="prose-sm space-y-2 text-sm leading-relaxed [&_h2]:mt-3 [&_h2]:text-base [&_h3]:mt-2 [&_li]:ml-4 [&_p]:text-sm [&_strong]:text-lime-400">
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}

// ==================== HOJE ====================
export function TodayScreen() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [done, setDone] = useState<Record<number, boolean>>({});

  useEffect(() => {
    api<Brief>("/api/brief").then(setBrief).catch((e) => toast.error(e.message));
    api<WorkoutPlan>("/api/plan/workout").then(setPlan).catch(() => {});
  }, []);

  const todayName = new Date().toLocaleDateString("pt", { weekday: "long" });
  const todayPlan = plan?.days?.find(
    (d) => d.day.toLowerCase().startsWith(todayName.toLowerCase().slice(0, 3))
  );

  return (
    <div className="space-y-4">
      <Card className="border-lime-500/30 bg-gradient-to-br from-lime-500/10 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">⚡ {brief?.headline ?? "A carregar o teu dia…"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Foco: {brief?.focus ?? "—"}</p>
          <div className="mt-3 space-y-1.5">
            {brief?.checklist?.map((c, i) => (
              <label key={i} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!done[i]}
                  onChange={() => setDone((d) => ({ ...d, [i]: !d[i] }))}
                  className="size-4 accent-lime-500"
                />
                <span className={done[i] ? "text-muted-foreground line-through" : ""}>{c}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {todayPlan && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">🏋️ Treino de hoje — {todayPlan.focus}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {todayPlan.exercises.map((ex, i) => (
              <div key={i} className="flex items-baseline justify-between gap-2">
                <span>{ex.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  {ex.sets}×{ex.reps} · {ex.rest}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {brief?.nudges && brief.nudges.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">⏰ Avisos de hoje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {brief.nudges
              .slice()
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((n, i) => (
                <div key={i} className="flex gap-2">
                  <Badge variant="outline" className="font-mono">{n.time}</Badge>
                  <span>{n.message}</span>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== TREINO ====================
export function WorkoutScreen() {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState(4);
  const [logs, setLogs] = useState<{ date: string; planDay?: string; aiNotes?: string }[]>([]);

  const load = useCallback(() => {
    api<WorkoutPlan | null>("/api/plan/workout").then((p) => {
      setPlan(p);
      setDays(p?.daysPerWeek ?? 4);
    }).catch(() => {});
    api<typeof logs>("/api/workout/logs?limit=10").then(setLogs).catch(() => {});
  }, []);

  useEffect(load, [load]);

  async function generate() {
    setBusy(true);
    toast("A gerar plano com IA… 💪");
    try {
      setPlan(await api<WorkoutPlan>("/api/plan/workout", { method: "POST", body: JSON.stringify({ daysPerWeek: days }) }));
      toast.success("Plano novo criado!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Plano de treino</h2>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={2}
            max={7}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-16 text-center"
          />
          <Button onClick={generate} disabled={busy} className="bg-lime-500 text-black hover:bg-lime-400">
            {busy ? "…" : "Gerar IA"}
          </Button>
        </div>
      </div>

      {plan?.days?.map((d, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {d.day} <span className="text-muted-foreground">· {d.focus}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {d.exercises.map((ex, j) => (
              <div key={j}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{ex.name}</span>
                  <span className="shrink-0 text-muted-foreground">{ex.sets}×{ex.reps} · {ex.rest}</span>
                </div>
                {ex.notes && <p className="text-xs text-muted-foreground">{ex.notes}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {logs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Histórico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {logs.map((l, i) => (
              <div key={i}>
                <span className="font-mono">{l.date}</span> {l.planDay ? `· ${l.planDay}` : ""} {l.aiNotes ? `— ${l.aiNotes}` : ""}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== NUTRIÇÃO ====================
export function NutritionScreen() {
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [supps, setSupps] = useState<Supplement[]>([]);
  const [ingredients, setIngredients] = useState("");
  const [busy, setBusy] = useState(false);
  const [suppName, setSuppName] = useState("");
  const [suppDose, setSuppDose] = useState("");
  const [suppBusy, setSuppBusy] = useState(false);

  const load = useCallback(() => {
    api<MealPlan | null>("/api/plan/meals").then(setPlan).catch(() => {});
    api<Supplement[]>("/api/supplements").then(setSupps).catch(() => {});
  }, []);

  useEffect(load, [load]);

  async function generate(byIngredients: boolean) {
    setBusy(true);
    toast("A cozinhar plano com IA… 🍚");
    try {
      const body = byIngredients
        ? { ingredients: ingredients.split(",").map((s) => s.trim()).filter(Boolean) }
        : {};
      setPlan(await api<MealPlan>("/api/plan/meals", { method: "POST", body: JSON.stringify(body) }));
      toast.success("Plano alimentar pronto!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addSupp() {
    if (!suppName.trim()) return;
    setSuppBusy(true);
    try {
      const s = await api<Supplement>("/api/supplements", {
        method: "POST",
        body: JSON.stringify({ name: suppName.trim(), dosage: suppDose.trim() || undefined }),
      });
      setSupps((x) => [...x, s]);
      setSuppName("");
      setSuppDose("");
      toast.success("Suplemento adicionado — a IA definiu horários e cuidados.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSuppBusy(false);
    }
  }

  async function removeSupp(id?: string) {
    if (!id) return;
    await api(`/api/supplements/${id}`, { method: "DELETE" });
    setSupps((x) => x.filter((s) => s._id !== id));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">🍳 Com o que tenho em casa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            placeholder="Ingredientes separados por vírgula: ovos, arroz, frango, banana, aveia…"
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={() => generate(true)} disabled={busy || !ingredients.trim()} className="flex-1 bg-lime-500 text-black hover:bg-lime-400">
              Receitas com estes ingredientes
            </Button>
            <Button onClick={() => generate(false)} disabled={busy} variant="outline" className="flex-1">
              Plano geral
            </Button>
          </div>
        </CardContent>
      </Card>

      {plan?.text && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Plano alimentar {plan.source === "ingredientes" ? "(com os teus ingredientes)" : ""}</CardTitle>
          </CardHeader>
          <CardContent>
            <Md>{plan.text}</Md>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">💊 Suplementos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Nome (ex: creatina)" value={suppName} onChange={(e) => setSuppName(e.target.value)} />
            <Input placeholder="Dose (ex: 5g)" value={suppDose} onChange={(e) => setSuppDose(e.target.value)} className="w-28" />
            <Button onClick={addSupp} disabled={suppBusy || !suppName.trim()} className="bg-lime-500 text-black hover:bg-lime-400">
              +
            </Button>
          </div>
          {supps.map((s) => (
            <div key={s._id} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between">
                <b>{s.name} {s.dosage && <span className="text-muted-foreground">· {s.dosage}</span>}</b>
                <Button variant="ghost" size="sm" onClick={() => removeSupp(s._id)}>✕</Button>
              </div>
              <div className="mt-1 flex gap-1.5">
                {s.times?.map((t) => (
                  <Badge key={t} variant="outline" className="font-mono">{t}</Badge>
                ))}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{s.instructions}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== CORPO ====================
export function BodyScreen() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [m, setM] = useState({ weightKg: "", waistCm: "", armCm: "", chestCm: "", bodyFat: "", notes: "" });

  const load = useCallback(() => {
    api<Metric[]>("/api/metrics").then(setMetrics).catch(() => {});
    api<Photo[]>("/api/photos").then(setPhotos).catch(() => {});
  }, []);

  useEffect(load, [load]);

  async function saveMetric() {
    const body = Object.fromEntries(
      Object.entries(m).filter(([, v]) => v !== "").map(([k, v]) => [k, k === "notes" ? v : Number(v)])
    );
    if (!Object.keys(body).length) return;
    setBusy("metric");
    try {
      await api("/api/metrics", { method: "POST", body: JSON.stringify(body) });
      setM({ weightKg: "", waistCm: "", armCm: "", chestCm: "", bodyFat: "", notes: "" });
      load();
      toast.success("Medição registada!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function analyze() {
    setBusy("analyze");
    try {
      const r = await api<{ analysis: string }>("/api/analyze/progress", { method: "POST" });
      setAnalysis(r.analysis);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy("photo");
    try {
      const dataUrl = await fileToDataUrl(file);
      await api("/api/photos", { method: "POST", body: JSON.stringify({ dataUrl }) });
      load();
      toast.success("Foto analisada pela IA!");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
      e.target.value = "";
    }
  }

  const fields: [keyof typeof m, string][] = [
    ["weightKg", "Peso kg"], ["waistCm", "Cintura cm"], ["armCm", "Braço cm"], ["chestCm", "Peito cm"], ["bodyFat", "% gordura"],
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">📏 Nova medição</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {fields.map(([k, label]) => (
              <label key={k} className="text-xs text-muted-foreground">
                {label}
                <Input
                  type="number"
                  inputMode="decimal"
                  value={m[k]}
                  onChange={(e) => setM((x) => ({ ...x, [k]: e.target.value }))}
                  className="mt-1"
                />
              </label>
            ))}
          </div>
          <Input placeholder="Notas (opcional)" value={m.notes} onChange={(e) => setM((x) => ({ ...x, notes: e.target.value }))} />
          <div className="flex gap-2">
            <Button onClick={saveMetric} disabled={busy === "metric"} className="flex-1 bg-lime-500 text-black hover:bg-lime-400">
              Guardar
            </Button>
            <Button onClick={analyze} disabled={busy === "analyze"} variant="outline" className="flex-1">
              {busy === "analyze" ? "A analisar…" : "IA: analisar progresso"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {analysis && (
        <Card className="border-lime-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">📊 Análise da IA</CardTitle>
          </CardHeader>
          <CardContent>
            <Md>{analysis}</Md>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Medições</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 font-mono text-xs text-muted-foreground">
          {metrics.length === 0 && <p>Sem medições ainda.</p>}
          {metrics.map((x) => (
            <div key={x._id}>
              {x.date} — {x.weightKg ? `${x.weightKg}kg ` : ""}{x.waistCm ? `cintura ${x.waistCm}cm ` : ""}{x.armCm ? `braço ${x.armCm}cm ` : ""}{x.bodyFat ? `${x.bodyFat}% ` : ""}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">📷 Galeria de progresso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            {busy === "photo" ? "A analisar foto…" : "Tirar/enviar foto → análise da IA"}
            <input type="file" accept="image/*" capture="user" className="hidden" onChange={uploadPhoto} />
          </label>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <Dialog key={p._id}>
                <DialogTrigger
                  render={
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/photos/${p._id}/image`}
                      alt={p.date}
                      className="aspect-square w-full cursor-pointer rounded-lg object-cover"
                    />
                  }
                />
                <DialogContent className="max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Progresso — {p.date}</DialogTitle>
                  </DialogHeader>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/photos/${p._id}/image`} alt={p.date} className="rounded-lg" />
                  <Md>{p.analysis ?? "Sem análise."}</Md>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
