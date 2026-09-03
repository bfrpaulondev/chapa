"use client";

import { AimOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { Alert, Card, Flex, InputNumber, Segmented, Tag } from "antd";
import { recommendLoad, type LoggedSet } from "@/lib/training";

type ExerciseLoad = {
  name: string;
  sets: number;
  reps: string;
  rest: string;
};

const ACTION_LABEL = {
  calibrate: "CALIBRAR",
  increase: "SUBIR CARGA",
  keep: "MANTER CARGA",
  reduce: "REDUZIR CARGA",
};

export function LoadPrescription({ exercise, previousSets, value, onChange }: {
  exercise: ExerciseLoad;
  previousSets?: LoggedSet[];
  value: LoggedSet[];
  onChange: (sets: LoggedSet[]) => void;
}) {
  const recommendation = recommendLoad(exercise.reps, previousSets);
  const rows = Array.from({ length: exercise.sets }, (_, index) => value[index] ?? {});

  // -.-.-.- Preserve the other values of a set while editing one training signal.
  function updateSet(index: number, patch: LoggedSet) {
    const next = [...rows];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  return (
    <Card className="load-prescription" title={<><AimOutlined /> Carga e repetições de hoje</>} bordered={false}>
      <Flex wrap gap={8} className="load-targets">
        <Tag color="lime">{exercise.sets} × {exercise.reps} REP</Tag>
        <Tag>RIR 2</Tag>
        <Tag>{exercise.rest} DESCANSO</Tag>
        <Tag color={recommendation.action === "reduce" ? "orange" : "cyan"}>{ACTION_LABEL[recommendation.action]}</Tag>
      </Flex>

      <Alert
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message={recommendation.weightKg ? `Peso sugerido: ${recommendation.weightKg} kg` : "Primeira sessão: descobrir a carga"}
        description={recommendation.reason}
      />

      <div className="set-log-heading"><span>SÉRIE</span><span>PESO</span><span>REP</span><span>RIR</span></div>
      <div className="set-log-list">
        {rows.map((set, index) => (
          <div className="set-log-row" key={index}>
            <strong>{String(index + 1).padStart(2, "0")}</strong>
            <InputNumber aria-label={`Peso da série ${index + 1}`} min={0} max={500} step={0.5} value={set.weightKg} placeholder="kg" onChange={(weightKg) => updateSet(index, { weightKg: weightKg ?? undefined })} />
            <InputNumber aria-label={`Repetições da série ${index + 1}`} min={0} max={100} value={set.reps} placeholder="rep" onChange={(reps) => updateSet(index, { reps: reps ?? undefined })} />
            <Segmented aria-label={`Repetições em reserva da série ${index + 1}`} value={set.rir} options={[0, 1, 2, 3, 4].map((rir) => ({ label: rir === 4 ? "4+" : rir, value: rir }))} onChange={(rir) => updateSet(index, { rir: Number(rir) })} />
          </div>
        ))}
      </div>
      <p className="rir-help"><strong>RIR</strong> = quantas repetições ainda conseguirias fazer com boa técnica. Para hipertrofia, aponta normalmente para 1–3; não precisas de chegar à falha em todas as séries.</p>
    </Card>
  );
}
