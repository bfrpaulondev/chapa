import { completeJSON, BASE_SYSTEM, userContext } from "./ai.js";
import {
  CheckInModel,
  CoachDecisionModel,
  LearningEventModel,
  LearningStateModel,
} from "./db.js";

export type ReadinessInput = {
  energy: number;
  sleepHours: number;
  soreness: number;
  stress: number;
  availableMinutes: number;
  notes?: string;
};

type DecisionMode = "push" | "maintain" | "recover";

export type CoachDecisionPayload = {
  title: string;
  mode: DecisionMode;
  confidence: number;
  readinessScore: number;
  summary: string;
  reasoning: string[];
  actions: { kind: string; title: string; detail: string; priority: number; status?: string }[];
};

// -.-.-.- Clamp user-controlled signals before they influence a decision.
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

// -.-.-.- Convert the check-in into stable features shared by runtime and Python training.
export function readinessFeatures(input: ReadinessInput) {
  return {
    energy: clamp(input.energy, 1, 10) / 10,
    sleep: clamp(input.sleepHours, 0, 10) / 8,
    recovery: 1 - clamp(input.soreness, 1, 10) / 10,
    calm: 1 - clamp(input.stress, 1, 10) / 10,
    time: clamp(input.availableMinutes, 10, 120) / 60,
  };
}

// -.-.-.- Calculate a transparent readiness score; the LLM explains, but cannot invent, this score.
export function readinessScore(input: ReadinessInput) {
  const f = readinessFeatures(input);
  return Math.round(clamp((f.energy * 0.3 + f.sleep * 0.25 + f.recovery * 0.25 + f.calm * 0.15 + Math.min(f.time, 1) * 0.05) * 100, 0, 100));
}

// -.-.-.- Keep a deterministic fallback so the coach still makes a safe decision if AI is unavailable.
function fallbackDecision(input: ReadinessInput, score: number): CoachDecisionPayload {
  const mode: DecisionMode = score >= 72 ? "push" : score <= 45 ? "recover" : "maintain";
  const title = mode === "push" ? "Dia de progredir" : mode === "recover" ? "Recuperar para crescer" : "Treino consistente";
  const training = mode === "recover"
    ? "Mobilidade, caminhada e técnica leve; evita séries até à falha."
    : mode === "push"
      ? `Treino principal de ${Math.min(input.availableMinutes, 75)} min com progressão de carga controlada.`
      : `Treino de ${Math.min(input.availableMinutes, 60)} min, mantendo 2 repetições em reserva.`;

  return {
    title,
    mode,
    confidence: 78,
    readinessScore: score,
    summary: "A decisão combina sono, energia, dor muscular, stress e tempo disponível.",
    reasoning: [
      `${input.sleepHours} h de sono e energia ${input.energy}/10`,
      `Dor muscular ${input.soreness}/10 e stress ${input.stress}/10`,
      `${input.availableMinutes} minutos disponíveis`,
    ],
    actions: [
      { kind: "training", title: "Treino", detail: training, priority: 1 },
      { kind: "nutrition", title: "Nutrição", detail: "Garante proteína em 3–5 refeições e hidratação regular.", priority: 2 },
      { kind: "recovery", title: "Recuperação", detail: "Protege 7,5–9 h de sono e ajusta se surgir dor articular.", priority: 3 },
    ],
  };
}

// -.-.-.- Create one auditable autonomous decision from live signals and learned feedback.
export async function createCoachDecision(date: string, input: ReadinessInput) {
  const normalized: ReadinessInput = {
    energy: clamp(input.energy, 1, 10),
    sleepHours: clamp(input.sleepHours, 0, 14),
    soreness: clamp(input.soreness, 1, 10),
    stress: clamp(input.stress, 1, 10),
    availableMinutes: clamp(input.availableMinutes, 10, 180),
    notes: input.notes?.slice(0, 500),
  };
  const score = readinessScore(normalized);
  const baseline = fallbackDecision(normalized, score);
  const [context, learning] = await Promise.all([
    userContext(),
    LearningStateModel.findOne({ key: "global" }).lean(),
  ]);

  let decision = baseline;
  try {
    const generated = await completeJSON<Omit<CoachDecisionPayload, "readinessScore">>(
      `${BASE_SYSTEM} És um agente de decisão, não um chatbot. Recebes sinais objectivos, histórico e preferências aprendidas. ` +
        `Decide autonomamente a melhor carga do dia. Não diagnostiques nem prometas resultados. ` +
        `Devolve JSON estrito com title, mode (push|maintain|recover), confidence (0-100), summary, reasoning (3 itens) e actions ` +
        `(3 itens com kind training|nutrition|recovery, title, detail e priority). Respeita o modo-base de segurança quando o score é baixo.`,
      `Data: ${date}\nCheck-in: ${JSON.stringify(normalized)}\nReadiness calculada: ${score}/100\nModo-base seguro: ${baseline.mode}\n` +
        `Aprendizagem: ${JSON.stringify(learning ?? {})}\n${context}`,
      1100
    );
    const generatedMode = generated.mode;
    const unsafePush = score <= 45 && generatedMode === "push";
    if (!unsafePush && Array.isArray(generated.actions) && generated.actions.length >= 3) {
      decision = {
        ...generated,
        mode: ["push", "maintain", "recover"].includes(generatedMode) ? generatedMode : baseline.mode,
        confidence: clamp(generated.confidence, 0, 100),
        readinessScore: score,
        reasoning: generated.reasoning.slice(0, 4),
        actions: generated.actions.slice(0, 4),
      };
    }
  } catch (error) {
    console.warn("[chapa] Autonomous decision fallback:", (error as Error).message);
  }

  const checkIn = await CheckInModel.create({ date, ...normalized });
  return CoachDecisionModel.create({
    date,
    ...decision,
    checkInId: checkIn._id,
    modelVersion: learning?.modelVersion ?? "rules-v1",
  });
}

// -.-.-.- Learn preferences online from completed decisions without retraining the language model.
export async function recordDecisionFeedback(input: {
  decisionId: string;
  rating: number;
  perceivedExertion: number;
  completed: boolean;
}) {
  const decision = await CoachDecisionModel.findById(input.decisionId).lean();
  if (!decision) throw new Error("Decisão não encontrada");

  const rating = clamp(input.rating, 1, 5);
  const exertion = clamp(input.perceivedExertion, 1, 10);
  const reward = clamp((rating - 3) / 2 + (input.completed ? 0.25 : -0.25) - Math.max(0, exertion - 9) * 0.15, -1, 1);
  const featureKey = `mode_${decision.mode ?? "maintain"}`;
  const current = await LearningStateModel.findOne({ key: "global" }).lean();
  const previousSamples = Number(current?.samples ?? 0);
  const samples = previousSamples + 1;
  const rawWeights = current?.weights as Map<string, number> | Record<string, number> | undefined;
  const currentWeights = rawWeights instanceof Map ? Object.fromEntries(rawWeights.entries()) : { ...(rawWeights ?? {}) };
  const weights = { ...currentWeights, [featureKey]: (currentWeights[featureKey] ?? 0) + reward * 0.08 };
  const averageReward = (Number(current?.averageReward ?? 0) * previousSamples + reward) / samples;

  await Promise.all([
    LearningEventModel.create({
      decisionId: decision._id,
      rating,
      perceivedExertion: exertion,
      completed: input.completed,
      reward,
      features: { [featureKey]: 1 },
    }),
    LearningStateModel.findOneAndUpdate(
      { key: "global" },
      { key: "global", weights, samples, averageReward, modelVersion: "online-v1" },
      { upsert: true, new: true }
    ),
    CoachDecisionModel.findByIdAndUpdate(decision._id, { reward }),
  ]);

  return { ok: true, reward, samples, modelVersion: "online-v1" };
}
