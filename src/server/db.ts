import mongoose, { Schema, type Model, type InferSchemaType } from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI ?? "";
if (!MONGODB_URI) {
  console.warn("[chapa] MONGODB_URI não definida — rotas de dados vão falhar");
}

let connPromise: Promise<typeof mongoose> | null = null;

export function db() {
  if (!connPromise) {
    connPromise = mongoose.connect(MONGODB_URI, { dbName: "chapa" });
  }
  return connPromise;
}

const Profile = new Schema(
  {
    name: String,
    sex: String,
    age: Number,
    heightCm: Number,
    weightKg: Number,
    goal: String, // "perder_gordura" | "ganhar_massa" | "recompor"
    experience: String, // "iniciante" | "intermediario" | "avancado"
    daysPerWeek: Number,
    equipment: [String],
    dietStyle: String,
    photoDataUrl: String, // dataURL (base64) — foto do mini avatar
    onboarded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Metric = new Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    weightKg: Number,
    waistCm: Number,
    armCm: Number,
    chestCm: Number,
    bodyFat: Number,
    notes: String,
  },
  { timestamps: true }
);

const WorkoutPlan = new Schema(
  {
    active: { type: Boolean, default: true },
    goal: String,
    daysPerWeek: Number,
    split: String,
    days: [
      {
        day: String,
        focus: String,
        exercises: [
          {
            name: String,
            sets: Number,
            reps: String,
            rest: String,
            notes: String,
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

const WorkoutLog = new Schema(
  {
    date: { type: String, required: true },
    planDay: String,
    exercises: [
      { name: String, sets: [{ weightKg: Number, reps: Number }] },
    ],
    feeling: String,
    aiNotes: String,
  },
  { timestamps: true }
);

const MealPlan = new Schema(
  {
    active: { type: Boolean, default: true },
    targetKcal: Number,
    proteinG: Number,
    source: String, // "geral" | "ingredientes"
    ingredients: [String],
    text: String, // plano em markdown
  },
  { timestamps: true }
);

const Supplement = new Schema(
  {
    name: { type: String, required: true },
    dosage: String,
    times: [String], // ["07:30", "12:00"]
    withFood: Boolean,
    instructions: String, // IA: quando tomar, o que evitar, ciclo
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Photo = new Schema(
  {
    date: { type: String, required: true },
    dataUrl: { type: String, required: true },
    note: String,
    analysis: String, // análise da IA (visão)
  },
  { timestamps: true }
);

const ChatMessage = new Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

const DailyBrief = new Schema(
  {
    date: { type: String, required: true, unique: true },
    headline: String,
    focus: String,
    checklist: [String],
    nudges: [{ time: String, message: String, kind: String }], // avisos proativos do dia
  },
  { timestamps: true }
);

const TipCache = new Schema({
  key: { type: String, required: true, unique: true }, // screen+date
  text: String,
});

function model<T>(name: string, schema: Schema): Model<InferSchemaType<typeof schema>> {
  return mongoose.models[name] ?? mongoose.model(name, schema);
}

export const ProfileModel = model("Profile", Profile);
export const MetricModel = model("Metric", Metric);
export const WorkoutPlanModel = model("WorkoutPlan", WorkoutPlan);
export const WorkoutLogModel = model("WorkoutLog", WorkoutLog);
export const MealPlanModel = model("MealPlan", MealPlan);
export const SupplementModel = model("Supplement", Supplement);
export const PhotoModel = model("Photo", Photo);
export const ChatMessageModel = model("ChatMessage", ChatMessage);
export const DailyBriefModel = model("DailyBrief", DailyBrief);
export const TipCacheModel = model("TipCache", TipCache);

export function today() {
  return new Date().toISOString().slice(0, 10);
}
