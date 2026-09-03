export type LoggedSet = { weightKg?: number; reps?: number; rir?: number };

export type LoadRecommendation = {
  action: "calibrate" | "increase" | "keep" | "reduce";
  weightKg?: number;
  reason: string;
};

// -.-.-.- Read the first repetition interval from plans such as "8-12" or "10–15".
export function parseRepRange(reps: string) {
  const values = reps.match(/\d+/g)?.map(Number) ?? [];
  const minimum = values[0] ?? 8;
  return { minimum, maximum: values[1] ?? minimum };
}

// -.-.-.- Round progression to a practical half-kilogram step.
function roundLoad(weightKg: number) {
  return Math.round(weightKg * 2) / 2;
}

// -.-.-.- Apply double progression using completed reps and repetitions in reserve.
export function recommendLoad(reps: string, previousSets?: LoggedSet[]): LoadRecommendation {
  const completed = previousSets?.filter((set) => Number(set.weightKg) > 0 && Number(set.reps) > 0) ?? [];
  if (!completed.length) {
    return {
      action: "calibrate",
      reason: "Começa leve e sobe gradualmente até terminares a série com técnica limpa e cerca de 2 repetições em reserva.",
    };
  }

  const { minimum, maximum } = parseRepRange(reps);
  const weightKg = completed.at(-1)?.weightKg ?? 0;
  const lowestReps = Math.min(...completed.map((set) => set.reps ?? 0));
  const averageRir = completed.reduce((total, set) => total + (set.rir ?? 2), 0) / completed.length;

  if (lowestReps < minimum) {
    return { action: "reduce", weightKg: roundLoad(weightKg * 0.95), reason: "Ficaste abaixo do intervalo alvo. Reduz 5% para recuperar técnica e repetições." };
  }
  if (lowestReps >= maximum && averageRir >= 2) {
    return { action: "increase", weightKg: roundLoad(weightKg * 1.025), reason: "Atingiste o topo do intervalo sem chegar à falha. Sobe cerca de 2,5%." };
  }
  if (averageRir >= 4) {
    return { action: "increase", weightKg: roundLoad(weightKg * 1.05), reason: "A carga ficou demasiado leve. Sobe cerca de 5% e mantém a técnica." };
  }
  return { action: "keep", weightKg: roundLoad(weightKg), reason: "Mantém esta carga e tenta acrescentar uma repetição antes de subir o peso." };
}
