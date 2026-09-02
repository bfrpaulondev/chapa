import OpenAI from "openai";
import {
  ProfileModel,
  WorkoutPlanModel,
  MetricModel,
  SupplementModel,
} from "./db";

const MODEL = process.env.AI_MODEL ?? "gpt-4o-mini";
const VISION_MODEL = process.env.AI_VISION_MODEL ?? "gpt-4o";

let _client: OpenAI | null = null;
export function ai() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY não configurada");
  }
  _client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _client;
}

export const BASE_SYSTEM = [
  "És o CHAPA, mini-coach pessoal de academia do Bruno.",
  "Estilo: direto, motivador, sem enrolação, como um treinador amigo.",
  "Responde SEMPRE em português (do utilizador), curto e acionável.",
  "Nunca dás conselho médico; em caso de dor/lesão recomendares profissional.",
].join(" ");

/** Contexto do utilizador (perfil + plano ativo + métricas + suplementos) para injetar nos prompts. */
export async function userContext(): Promise<string> {
  const [profile, plan, metrics, sups] = (await Promise.all([
    ProfileModel.findOne().sort({ updatedAt: -1 }).lean(),
    WorkoutPlanModel.findOne({ active: true }).lean(),
    MetricModel.find().sort({ date: -1 }).limit(8).lean(),
    SupplementModel.find({ active: true }).lean(),
  ])) as unknown as [
    Record<string, unknown> | null,
    { split?: string; days?: { day: string; focus: string }[] } | null,
    Record<string, unknown>[],
    { name: string; dosage?: string; times?: string[] }[],
  ];
  const parts: string[] = [];
  if (profile) {
    parts.push(
      `Perfil: ${JSON.stringify({
        ...profile,
        photoDataUrl: undefined,
        _id: undefined,
        __v: undefined,
      })}`
    );
  }
  if (plan) {
    parts.push(
      `Plano de treino ativo (${plan.split ?? ""}): ${(plan.days ?? [])
        .map((d) => `${d.day}=${d.focus}`)
        .join(", ")}`    );
  }
  if (metrics.length) {
    parts.push(
      `Últimas métricas: ${metrics
        .map((m) => `${m.date}: ${m.weightKg ?? "?"}kg, cintura ${m.waistCm ?? "?"}cm, braço ${m.armCm ?? "?"}cm`)
        .join(" | ")}`
    );
  }
  if (sups.length) {
    parts.push(
      `Suplementos ativos: ${sups.map((s) => `${s.name} ${s.dosage ?? ""} (${(s.times ?? []).join("/")})`).join(", ")}`
    );
  }
  return parts.join("\n");
}

export async function complete(system: string, user: string, maxTokens = 700): Promise<string> {
  const res = await ai().chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return res.choices[0]?.message?.content ?? "";
}

export async function completeJSON<T>(system: string, user: string, maxTokens = 1600): Promise<T> {
  const res = await ai().chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const raw = res.choices[0]?.message?.content ?? "{}";
  return JSON.parse(raw) as T;
}

export async function vision(system: string, imageUrl: string, user: string): Promise<string> {
  const res = await ai().chat.completions.create({
    model: VISION_MODEL,
    max_tokens: 700,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: [
          { type: "text", text: user },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
  });
  return res.choices[0]?.message?.content ?? "";
}

export async function* stream(system: string, history: { role: "user" | "assistant"; content: string }[]) {
  const stream = await ai().chat.completions.create({
    model: MODEL,
    max_tokens: 900,
    stream: true,
    messages: [{ role: "system", content: system }, ...history],
  });
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
