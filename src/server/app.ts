import fastify, { type FastifyInstance } from "fastify";
import {
  db,
  ProfileModel,
  MetricModel,
  WorkoutPlanModel,
  WorkoutLogModel,
  MealPlanModel,
  SupplementModel,
  PhotoModel,
  ChatMessageModel,
  DailyBriefModel,
  TipCacheModel,
  today,
} from "./db";
import { BASE_SYSTEM, complete, completeJSON, stream, userContext, vision } from "./ai";

const MAX_IMAGE_CHARS = 6_000_000; // ~4.5MB de imagem base64

export function buildApp(): FastifyInstance {
  const app = fastify({ logger: false, bodyLimit: 12_000_000 });

  app.addHook("onRequest", async () => {
    await db();
  });

  app.get("/api/health", async () => ({ ok: true, ts: Date.now() }));

  // ---------- Perfil ----------
  app.get("/api/profile", async () => ProfileModel.findOne().sort({ updatedAt: -1 }).lean());

  app.put("/api/profile", async (req) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (typeof b.photoDataUrl === "string" && b.photoDataUrl.length > MAX_IMAGE_CHARS) {
      throw new Error("Foto demasiado grande (máx ~4MB)");
    }
    const doc = await ProfileModel.findOneAndUpdate(
      {},
      { ...b, onboarded: true },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    return doc;
  });

  // ---------- Briefing diário (Hoje) ----------
  app.get("/api/brief", async () => {
    const date = today();
    const existing = await DailyBriefModel.findOne({ date }).lean();
    if (existing) return existing;

    const ctx = await userContext();
    const brief = await completeJSON<{
      headline: string;
      focus: string;
      checklist: string[];
      nudges: { time: string; message: string; kind: string }[];
    }>(
      BASE_SYSTEM +
        ' Geras o briefing do dia em JSON: {"headline": "1 frase motivacional", "focus": "foco do dia", "checklist": ["4-6 itens do dia (treino, suplementos, água, etc)"], "nudges": [{"time": "HH:MM", "message": "aviso curto proativo", "kind": "suplemento|treino|agua|motivacao"}]}. ' +
        "Os nudges devem cobrir horários lógicos do dia (acordar, refeições, treino, dormir) conforme suplementos e rotina do utilizador. Entre 3 e 6 nudges.",
      `Hoje é ${date}.\n${ctx}`,
      1200
    );
    return DailyBriefModel.findOneAndUpdate(
      { date },
      { date, ...brief },
      { new: true, upsert: true }
    ).lean();
  });

  // ---------- Dicas contextuais do avatar ----------
  app.post("/api/coach/tip", async (req) => {
    const { screen } = (req.body ?? {}) as { screen?: string };
    const date = today();
    const key = `${screen}:${date}`;
    const cached = await TipCacheModel.findOne({ key }).lean();
    if (cached) return { tip: cached.text };

    const ctx = await userContext();
    const tip = await complete(
      BASE_SYSTEM + " Dás UMA dica ultra curta (máx 30 palavras) contextual ao ecrã onde o utilizador está. Sem saudações.",
      `Ecrã atual: ${screen}\n${ctx}`,
      120
    );
    await TipCacheModel.updateOne({ key }, { key, text: tip }, { upsert: true });
    return { tip };
  });

  // ---------- Coach chat (streaming) ----------
  app.get("/api/coach/chat", async () =>
    ChatMessageModel.find().sort({ createdAt: -1 }).limit(50).lean().then((r) => r.reverse())
  );

  app.post("/api/coach/chat", async (req, reply) => {
    const { message } = (req.body ?? {}) as { message?: string };
    if (!message) return reply.code(400).send({ error: "message obrigatória" });
    await ChatMessageModel.create({ role: "user", content: message });

    const historyDocs = await ChatMessageModel.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()
      .then((r) => r.reverse());
    const ctx = await userContext();
    const system = `${BASE_SYSTEM}\nContexto atual do Bruno:\n${ctx}`;

    reply.hijack();
    reply.raw.writeHead(200, {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-cache",
      "x-accel-buffering": "no",
    });

    let full = "";
    try {
      for await (const delta of stream(system, historyDocs as never)) {
        full += delta;
        reply.raw.write(delta);
      }
    } catch (err) {
      reply.raw.write(`\n[erro na IA: ${(err as Error).message}]`);
    }
    if (full.trim()) await ChatMessageModel.create({ role: "assistant", content: full });
    reply.raw.end();
  });

  // ---------- Plano de treino ----------
  app.get("/api/plan/workout", async () => WorkoutPlanModel.findOne({ active: true }).lean());

  app.post("/api/plan/workout", async (req) => {
    const body = (req.body ?? {}) as { daysPerWeek?: number; goal?: string; notes?: string };
    const profile = await ProfileModel.findOne().sort({ updatedAt: -1 }).lean();
    const ctx = await userContext();
    const plan = await completeJSON<{
      split: string;
      days: { day: string; focus: string; exercises: { name: string; sets: number; reps: string; rest: string; notes: string }[] }[];
    }>(
      BASE_SYSTEM +
        ' Geras um plano de treino em JSON: {"split": "nome do split", "days": [{"day": "Segunda", "focus": "Peito/Tríceps", "exercises": [{"name": "", "sets": 4, "reps": "8-12", "rest": "90s", "notes": "dica curta"}]}]}. ' +
        "Entre 5 e 8 exercícios por dia. Consistente com objetivo, experiência e equipamento do utilizador.",
      `Gerar plano. ${body.daysPerWeek ? `Dias/semana: ${body.daysPerWeek}.` : ""} ${body.goal ? `Objetivo: ${body.goal}.` : ""} ${body.notes ?? ""}\n${ctx}`,
      2600
    );
    await WorkoutPlanModel.updateMany({ active: true }, { active: false });
    return WorkoutPlanModel.create({
      active: true,
      goal: body.goal ?? profile?.goal ?? "",
      daysPerWeek: body.daysPerWeek ?? profile?.daysPerWeek ?? 4,
      ...plan,
    });
  });

  app.post("/api/workout/log", async (req) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const log = await WorkoutLogModel.create({ date: today(), ...b } as never);
    const aiNotes = await complete(
      BASE_SYSTEM + " Comenta o treino em 2 frases: reforço positivo + 1 ajuste concreto para o próximo.",
      `Treino registado: ${JSON.stringify(b)}`,
      160
    );
    return { log, aiNotes };
  });

  app.get("/api/workout/logs", async (req) => {
    const q = Number((req.query as { limit?: string }).limit ?? 14);
    return WorkoutLogModel.find().sort({ date: -1 }).limit(Math.min(q, 60)).lean();
  });

  // ---------- Nutrição ----------
  app.get("/api/plan/meals", async () => MealPlanModel.findOne({ active: true }).lean());

  app.post("/api/plan/meals", async (req) => {
    const body = (req.body ?? {}) as { ingredients?: string[]; targetKcal?: number; style?: string };
    const ctx = await userContext();
    const text = await complete(
      BASE_SYSTEM +
        " Geras um plano alimentar prático em markdown: macros alvo, 4-6 refeições com porções simples e opções de troca.",
      body.ingredients?.length
        ? `Criar plano de refeições usando ESTES ingredientes que o utilizador tem em casa: ${body.ingredients.join(", ")}. ${body.targetKcal ? `Alvo: ${body.targetKcal} kcal.` : ""} ${body.style ?? ""}\n${ctx}`
        : `Criar plano alimentar diário. ${body.targetKcal ? `Alvo: ${body.targetKcal} kcal.` : ""} ${body.style ?? ""}\n${ctx}`,
      1800
    );
    await MealPlanModel.updateMany({ active: true }, { active: false });
    return MealPlanModel.create({
      active: true,
      source: body.ingredients?.length ? "ingredientes" : "geral",
      ingredients: body.ingredients ?? [],
      targetKcal: body.targetKcal ?? null,
      proteinG: null,
      text,
    });
  });

  // ---------- Suplementos ----------
  app.get("/api/supplements", async () => SupplementModel.find({ active: true }).sort({ createdAt: 1 }).lean());

  app.post("/api/supplements", async (req) => {
    const { name, dosage } = (req.body ?? {}) as { name?: string; dosage?: string };
    if (!name) throw new Error("name obrigatório");
    const instructions = await complete(
      BASE_SYSTEM +
        " Para um suplemento, devolve exatamente 4 linhas no formato: 'Quando: ...' 'Como: ...' 'Cuidado: ...' 'Ciclo: ...'. Objetivo: protocolog seguro e eficaz.",
      `Suplemento: ${name}. Dose informada: ${dosage ?? "não informada"}`,
      220
    );
    const times = await completeJSON<{ times: string[] }>(
      'Devolve JSON {"times": ["HH:MM"]} com os melhores horários para tomar este suplemento (1 a 3 horários).',
      `Suplemento: ${name}. Instruções: ${instructions}`,
      100
    );
    const withFood = !/jejum|estômago vazio|empty stomach/i.test(instructions);
    return SupplementModel.create({
      name,
      dosage,
      times: times.times ?? [],
      withFood,
      instructions,
      active: true,
    });
  });

  app.delete("/api/supplements/:id", async (req) => {
    const { id } = req.params as { id: string };
    await SupplementModel.findByIdAndUpdate(id, { active: false });
    return { ok: true };
  });

  // ---------- Métricas corporais ----------
  app.get("/api/metrics", async () => MetricModel.find().sort({ date: -1 }).limit(60).lean());

  app.post("/api/metrics", async (req) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const metric = await MetricModel.create({ date: today(), ...b } as never);
    return metric;
  });

  app.post("/api/analyze/progress", async () => {
    const [metrics, logs] = await Promise.all([
      MetricModel.find().sort({ date: 1 }).limit(60).lean(),
      WorkoutLogModel.find().sort({ date: -1 }).limit(20).lean(),
    ]);
    if (metrics.length < 2) {
      return { analysis: "Regista pelo menos 2 medições para eu analisar a tua tendência 💪" };
    }
    const analysis = await complete(
      BASE_SYSTEM +
        " Analisas a tendência das métricas corporais e treinos. Devolve markdown com: tendência (peso/cintura/braço), o que está a funcionar, 2 ajustes concretos e previsão a 30 dias. Seja honesto com números.",
      `Métricas (antigas→novas): ${JSON.stringify(metrics)}\nÚltimos treinos: ${JSON.stringify(logs.slice(0, 10))}`,
      900
    );
    return { analysis };
  });

  // ---------- Fotos de progresso (visão) ----------
  app.get("/api/photos", async () =>
    PhotoModel.find().sort({ date: -1 }).limit(60).lean().then((r) =>
      r.map((p) => ({ _id: p._id, date: p.date, note: p.note, analysis: p.analysis }))
    )
  );

  app.post("/api/photos", async (req) => {
    const { dataUrl, note } = (req.body ?? {}) as { dataUrl?: string; note?: string };
    if (!dataUrl || !dataUrl.startsWith("data:image/")) throw new Error("dataUrl de imagem obrigatória");
    if (dataUrl.length > MAX_IMAGE_CHARS) throw new Error("Foto demasiado grande (máx ~4MB)");

    const metrics = await MetricModel.find().sort({ date: -1 }).limit(3).lean();
    const analysis = await vision(
      BASE_SYSTEM +
        " Analisas fotos de progresso físico: postura, definição, distribuição de massa, pontos fortes e 2 focos de treino para as próximas semanas. Construtivo e motivador, sem exageros.",
      dataUrl,
      `Foto de progresso de hoje (${today()}). ${note ?? ""} Métricas recentes: ${JSON.stringify(metrics)}`
    );
    return PhotoModel.create({ date: today(), dataUrl, note, analysis });
  });

  app.get("/api/photos/:id/image", async (req, reply) => {
    const { id } = req.params as { id: string };
    const photo = (await PhotoModel.findById(id).lean()) as { dataUrl?: string } | null;
    if (!photo?.dataUrl) return reply.code(404).send({ error: "não encontrada" });
    const [, base64] = photo.dataUrl.split(",");
    const mime = photo.dataUrl.slice(5, photo.dataUrl.indexOf(";"));
    return reply.header("content-type", mime).send(Buffer.from(base64, "base64"));
  });

  return app;
}
