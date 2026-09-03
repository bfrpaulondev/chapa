"use client";

import {
  AreaChartOutlined,
  ArrowRightOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  DashboardOutlined,
  FireFilled,
  HeartOutlined,
  MessageOutlined,
  PlayCircleFilled,
  ReloadOutlined,
  RobotOutlined,
  ThunderboltFilled,
  TrophyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Layout,
  List,
  Menu,
  Modal,
  Progress,
  Rate,
  Row,
  Segmented,
  Skeleton,
  Slider,
  Space,
  Statistic,
  Tag,
  Timeline,
} from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  api,
  streamChat,
  type ChatMsg,
  type CoachDecision,
  type ExerciseGuide,
  type MealPlan,
  type Metric,
  type PlanDay,
  type Profile,
  type WorkoutLog,
  type WorkoutPlan,
  type WorkoutSet,
} from "@/lib/api";
import { LoadPrescription } from "./load-prescription";
import { MovementGuide } from "./movement-guide";
import { YouTubeExercise } from "./youtube-exercise";

const { Header, Sider, Content } = Layout;
const { TextArea } = Input;

type ScreenId = "command" | "workout" | "progress" | "fuel" | "coach";

const NAV_ITEMS = [
  { key: "command", icon: <DashboardOutlined />, label: "Hoje" },
  { key: "workout", icon: <ThunderboltFilled />, label: "Treino" },
  { key: "progress", icon: <AreaChartOutlined />, label: "Evolução" },
  { key: "fuel", icon: <FireFilled />, label: "Nutrição" },
  { key: "coach", icon: <MessageOutlined />, label: "VIGOR IA" },
];

const MODE_META = {
  push: { label: "PROGREDIR", color: "#c7ff4a" },
  maintain: { label: "CONSOLIDAR", color: "#7dd3fc" },
  recover: { label: "RECUPERAR", color: "#ffb86b" },
};

// -.-.-.- Render markdown without allowing raw HTML from model output.
function Markdown({ children }: { children: string }) {
  return <div className="ai-markdown"><ReactMarkdown>{children}</ReactMarkdown></div>;
}

// -.-.-.- Provide one responsive shell for desktop and installed-mobile use.
export function ChapaExperience() {
  const [screen, setScreen] = useState<ScreenId>("command");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    api<Profile | null>("/api/profile")
      .then((value) => {
        setProfile(value);
        if (!value?.onboarded) setProfileOpen(true);
      })
      .catch(() => undefined);
  }, []);

  const content = {
    command: <CommandCenter onStartWorkout={() => setScreen("workout")} />,
    workout: <WorkoutStudio />,
    progress: <ProgressLab />,
    fuel: <FuelPlan />,
    coach: <VigorCoach />,
  }[screen];

  return (
    <Layout className="chapa-shell">
      <Sider className="chapa-sider" width={236} breakpoint="lg" collapsedWidth={0} trigger={null}>
        <Brand />
        <Menu
          mode="inline"
          selectedKeys={[screen]}
          items={NAV_ITEMS}
          onClick={({ key }) => setScreen(key as ScreenId)}
          className="chapa-menu"
        />
        <Card className="coach-status" bordered={false}>
          <Flex gap={10} align="center">
            <Avatar className="vigor-avatar" icon={<RobotOutlined />} />
            <div>
              <strong>VIGOR</strong>
              <div className="status-copy"><span className="live-dot" /> a analisar</div>
            </div>
          </Flex>
        </Card>
      </Sider>

      <Layout>
        <Header className="chapa-header">
          <div className="mobile-brand"><Brand compact /></div>
          <div className="header-copy">
            <span className="eyebrow">COACH AUTÓNOMO</span>
            <strong>{profile?.name ? `Olá, ${profile.name.split(" ")[0]}` : "O teu plano vivo"}</strong>
          </div>
          <Button
            shape="circle"
            aria-label="Abrir perfil"
            icon={profile?.photoDataUrl ? <Avatar size={40} src={profile.photoDataUrl} /> : <UserOutlined />}
            onClick={() => setProfileOpen(true)}
          />
        </Header>
        <Content className="chapa-content">{content}</Content>
      </Layout>

      <nav className="mobile-nav" aria-label="Navegação principal">
        {NAV_ITEMS.map((item) => (
          <button key={item.key} className={screen === item.key ? "active" : ""} onClick={() => setScreen(item.key as ScreenId)}>
            {item.icon}<span>{item.label}</span>
          </button>
        ))}
      </nav>

      <ProfileDrawer open={profileOpen} profile={profile} onClose={() => setProfileOpen(false)} onSaved={setProfile} />
    </Layout>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "brand compact" : "brand"}>
      <span className="brand-mark"><ThunderboltFilled /></span>
      <span>CHAPA</span><i>AI</i>
    </div>
  );
}

// -.-.-.- Turn five readiness signals into a saved, auditable coach decision.
function CommandCenter({ onStartWorkout }: { onStartWorkout: () => void }) {
  const { message } = App.useApp();
  const [decision, setDecision] = useState<CoachDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [form] = Form.useForm();
  const [feedbackForm] = Form.useForm();

  useEffect(() => {
    api<CoachDecision | null>("/api/coach/decision").then(setDecision).catch(() => undefined).finally(() => setLoading(false));
  }, []);

  async function decide() {
    const values = await form.validateFields();
    setDeciding(true);
    try {
      const next = await api<CoachDecision>("/api/coach/decision", { method: "POST", body: JSON.stringify(values) });
      setDecision(next);
      setCheckInOpen(false);
      message.success("VIGOR analisou os sinais e tomou uma decisão.");
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setDeciding(false);
    }
  }

  async function sendFeedback() {
    if (!decision?._id) return;
    const values = await feedbackForm.validateFields();
    await api("/api/coach/feedback", {
      method: "POST",
      body: JSON.stringify({ decisionId: decision._id, ...values, completed: true }),
    });
    setFeedbackOpen(false);
    message.success("Aprendido. A próxima decisão já usa este feedback.");
  }

  if (loading) return <Skeleton active paragraph={{ rows: 8 }} />;

  return (
    <div className="screen-stack">
      <section className="hero-grid">
        <Card className="decision-card" bordered={false}>
          <div className="decision-glow" />
          <Flex justify="space-between" align="flex-start" gap={20} wrap>
            <div className="decision-copy">
              <Tag className="signal-tag" icon={<RobotOutlined />}>DECISÃO DA VIGOR</Tag>
              <h1>{decision?.title ?? "Diz-me como estás. Eu trato do resto."}</h1>
              <p>{decision?.summary ?? "Sono, energia, recuperação e histórico entram numa decisão clara para hoje."}</p>
              <Space wrap>
                <Button type="primary" size="large" icon={<ThunderboltFilled />} onClick={decision ? onStartWorkout : () => setCheckInOpen(true)}>
                  {decision ? "Começar treino" : "Check-in de 30 s"}
                </Button>
                {decision && <Button size="large" icon={<ReloadOutlined />} onClick={() => setCheckInOpen(true)}>Reavaliar</Button>}
              </Space>
            </div>
            <div className="readiness-orbit">
              <Progress
                type="circle"
                percent={decision?.readinessScore ?? 0}
                size={150}
                strokeColor={decision ? MODE_META[decision.mode].color : "#344241"}
                format={(value) => <><strong>{value}</strong><span>PRONTIDÃO</span></>}
              />
              {decision && <Tag color={MODE_META[decision.mode].color}>{MODE_META[decision.mode].label}</Tag>}
            </div>
          </Flex>
        </Card>

        <Card className="confidence-card" bordered={false}>
          <span className="eyebrow">CONFIANÇA</span>
          <Statistic value={decision?.confidence ?? 0} suffix="%" />
          <Progress percent={decision?.confidence ?? 0} showInfo={false} strokeColor="#7dd3fc" />
          <p>{decision?.modelVersion ? `Modelo ${decision.modelVersion}` : "À espera do primeiro sinal"}</p>
        </Card>
      </section>

      <section>
        <div className="section-heading">
          <div><span className="eyebrow">PLANO DINÂMICO</span><h2>As tuas próximas acções</h2></div>
          {decision && <Button type="text" icon={<CheckCircleFilled />} onClick={() => setFeedbackOpen(true)}>Dar feedback</Button>}
        </div>
        {decision ? (
          <Row gutter={[16, 16]}>
            {decision.actions.toSorted((a, b) => a.priority - b.priority).map((action, index) => (
              <Col xs={24} md={8} key={`${action.kind}-${index}`}>
                <Card className="action-card" bordered={false}>
                  <Flex justify="space-between"><span className="action-index">0{index + 1}</span><ActionIcon kind={action.kind} /></Flex>
                  <h3>{action.title}</h3>
                  <p>{action.detail}</p>
                  {action.kind === "training" && <Button type="link" onClick={onStartWorkout}>Abrir treino <ArrowRightOutlined /></Button>}
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Empty description="Faz o check-in e a VIGOR cria as prioridades do dia." />
        )}
      </section>

      {decision && (
        <Card className="reason-card" title="Porque decidi isto" bordered={false}>
          <Timeline items={decision.reasoning.map((reason) => ({ children: reason, color: MODE_META[decision.mode].color }))} />
        </Card>
      )}

      <Modal title="Check-in de prontidão" open={checkInOpen} onCancel={() => setCheckInOpen(false)} onOk={decide} confirmLoading={deciding} okText="Analisar e decidir">
        <Form form={form} layout="vertical" initialValues={{ energy: 7, sleepHours: 7.5, soreness: 4, stress: 4, availableMinutes: 60 }}>
          <SignalSlider name="energy" label="Energia" low="sem energia" high="eléctrico" />
          <Form.Item name="sleepHours" label="Horas de sono" rules={[{ required: true }]}><InputNumber min={0} max={14} step={0.5} suffix="h" className="full-width" /></Form.Item>
          <SignalSlider name="soreness" label="Dor muscular" low="solto" high="muito dorido" />
          <SignalSlider name="stress" label="Stress" low="calmo" high="no limite" />
          <Form.Item name="availableMinutes" label="Tempo disponível"><Segmented block options={[30, 45, 60, 75, 90].map((value) => ({ label: `${value} min`, value }))} /></Form.Item>
          <Form.Item name="notes" label="Algo que eu deva saber?"><TextArea rows={2} maxLength={500} placeholder="Ex.: dormi mal, joelho sensível, quero treinar peito…" /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Ensinar a VIGOR" open={feedbackOpen} onCancel={() => setFeedbackOpen(false)} onOk={sendFeedback} okText="Guardar aprendizagem">
        <Form form={feedbackForm} layout="vertical" initialValues={{ rating: 4, perceivedExertion: 7 }}>
          <Form.Item name="rating" label="Qualidade da decisão"><Rate /></Form.Item>
          <Form.Item name="perceivedExertion" label="Esforço percebido (RPE)"><Slider min={1} max={10} marks={{ 1: "leve", 7: "ideal", 10: "máximo" }} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function SignalSlider({ name, label, low, high }: { name: string; label: string; low: string; high: string }) {
  return (
    <Form.Item name={name} label={label} rules={[{ required: true }]}>
      <Slider min={1} max={10} marks={{ 1: low, 10: high }} />
    </Form.Item>
  );
}

function ActionIcon({ kind }: { kind: string }) {
  if (kind === "training") return <ThunderboltFilled className="action-icon lime" />;
  if (kind === "nutrition") return <FireFilled className="action-icon orange" />;
  return <HeartOutlined className="action-icon blue" />;
}

// -.-.-.- Combine plan generation, day selection, exercise guidance and session completion.
function WorkoutStudio() {
  const { message } = App.useApp();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedDay, setSelectedDay] = useState<PlanDay | null>(null);
  const [guide, setGuide] = useState<ExerciseGuide | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideLoading, setGuideLoading] = useState(false);
  const [activeExercise, setActiveExercise] = useState<PlanDay["exercises"][number] | null>(null);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [sessionSets, setSessionSets] = useState<Record<string, WorkoutSet[]>>({});

  useEffect(() => {
    Promise.all([
      api<WorkoutPlan | null>("/api/plan/workout"),
      api<WorkoutLog[]>("/api/workout/logs?limit=30"),
    ]).then(([value, logs]) => {
      setPlan(value);
      setSelectedDay(value?.days?.[0] ?? null);
      setWorkoutLogs(logs);
    }).catch(() => undefined).finally(() => setLoading(false));
  }, []);

  async function generate() {
    setGenerating(true);
    try {
      const value = await api<WorkoutPlan>("/api/plan/workout", { method: "POST", body: JSON.stringify({}) });
      setPlan(value);
      setSelectedDay(value.days?.[0] ?? null);
      message.success("Novo plano criado com o teu contexto actual.");
    } catch (error) {
      message.error((error as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  async function openGuide(exercise: PlanDay["exercises"][number]) {
    setGuideOpen(true);
    setActiveExercise(exercise);
    setGuideLoading(false);
    setGuide({
      name: exercise.name,
      muscles: [],
      steps: [
        exercise.notes,
        "Controla a fase de descida durante 2–3 segundos.",
        "Mantém o tronco estável e as articulações alinhadas.",
        "Interrompe a série se houver dor aguda ou perda de técnica.",
      ].filter(Boolean),
      videos: [],
      available: true,
    });
  }

  async function finishWorkout() {
    if (!selectedDay) return;
    const result = await api<{ aiNotes: string }>("/api/workout/log", {
      method: "POST",
      body: JSON.stringify({
        planDay: selectedDay.day,
        feeling: "completed",
        exercises: selectedDay.exercises.map((exercise) => ({ name: exercise.name, sets: sessionSets[exercise.name] ?? [] })),
      }),
    });
    setWorkoutLogs(await api<WorkoutLog[]>("/api/workout/logs?limit=30"));
    setSessionSets({});
    Modal.success({ title: "Treino concluído", content: result.aiNotes });
  }

  if (loading) return <Skeleton active paragraph={{ rows: 10 }} />;

  return (
    <div className="screen-stack">
      <div className="section-heading">
        <div><span className="eyebrow">TREINO PRESCRITO</span><h1>{plan?.split ?? "Ainda sem plano"}</h1></div>
        <Button type="primary" icon={<RobotOutlined />} loading={generating} onClick={generate}>{plan ? "Recriar com IA" : "Criar plano"}</Button>
      </div>
      {!plan?.days?.length ? <Empty description="A VIGOR ainda não criou um plano de treino." /> : (
        <>
          <Segmented
            className="day-selector"
            block
            value={selectedDay?.day}
            options={plan.days.map((day) => ({ label: day.day, value: day.day }))}
            onChange={(value) => setSelectedDay(plan.days?.find((day) => day.day === value) ?? null)}
          />
          {selectedDay && (
            <Card className="workout-session" bordered={false}>
              <Flex justify="space-between" align="center" gap={16} wrap>
                <div><span className="eyebrow">FOCO</span><h2>{selectedDay.focus}</h2></div>
                <Tag icon={<ClockCircleOutlined />}>{selectedDay.exercises.length} exercícios · ~60 min</Tag>
              </Flex>
              <List
                className="exercise-list"
                dataSource={selectedDay.exercises}
                renderItem={(exercise, index) => (
                  <List.Item actions={[<Button key="guide" type="text" icon={<PlayCircleFilled />} onClick={() => openGuide(exercise)}>Executar e registar</Button>]}>
                    <List.Item.Meta
                      avatar={<span className="exercise-number">{String(index + 1).padStart(2, "0")}</span>}
                      title={exercise.name}
                      description={<><Tag>{exercise.sets} séries</Tag><Tag>{exercise.reps} reps</Tag><Tag>{exercise.rest} descanso</Tag><span>{exercise.notes}</span></>}
                    />
                  </List.Item>
                )}
              />
              <Button type="primary" size="large" block icon={<TrophyOutlined />} onClick={finishWorkout}>Concluir sessão</Button>
            </Card>
          )}
        </>
      )}
      <Drawer title="Estúdio de movimento" open={guideOpen} onClose={() => setGuideOpen(false)} width={720}>
        {guideLoading ? <Skeleton active /> : guide && activeExercise ? (
          <ExerciseStudio
            guide={guide}
            exercise={activeExercise}
            previousSets={workoutLogs.flatMap((log) => log.exercises ?? []).find((entry) => entry.name === activeExercise.name && entry.sets.some((set) => Number(set.weightKg) > 0))?.sets}
            sessionSets={sessionSets[activeExercise.name] ?? []}
            onSessionSetsChange={(sets) => setSessionSets((current) => ({ ...current, [activeExercise.name]: sets }))}
          />
        ) : <Empty />}
      </Drawer>
    </div>
  );
}

// -.-.-.- Pair a reviewed human demonstration with the autonomous movement guide.
function ExerciseStudio({ guide, exercise, previousSets, sessionSets, onSessionSetsChange }: {
  guide: ExerciseGuide;
  exercise: PlanDay["exercises"][number];
  previousSets?: WorkoutSet[];
  sessionSets: WorkoutSet[];
  onSessionSetsChange: (sets: WorkoutSet[]) => void;
}) {
  return (
    <div className="studio-stack">
      <div><Tag color="lime">ESTÚDIO VIGOR</Tag><h2>{guide.name}</h2></div>
      <LoadPrescription exercise={exercise} previousSets={previousSets} value={sessionSets} onChange={onSessionSetsChange} />
      <YouTubeExercise exerciseName={guide.name} />
      <MovementGuide exerciseName={guide.name} />
      <Card title="Pontos de técnica" bordered={false}>
        <Timeline items={guide.steps.slice(0, 6).map((step) => ({ children: step, color: "#c7ff4a" }))} />
        <p className="safety-note">O vídeo demonstra a execução e o guia mostra o tempo, as fases e a intensidade relativa. Não substituem avaliação presencial nem fazem análise da câmara.</p>
      </Card>
    </div>
  );
}

// -.-.-.- Capture measurements and surface recent trends in a compact progress lab.
function ProgressLab() {
  const { message } = App.useApp();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [analysis, setAnalysis] = useState("");
  const [form] = Form.useForm();

  const load = useCallback(() => api<Metric[]>("/api/metrics").then(setMetrics).catch(() => undefined), []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    const values = await form.validateFields();
    await api("/api/metrics", { method: "POST", body: JSON.stringify(values) });
    form.resetFields();
    await load();
    message.success("Medição registada.");
  }

  async function analyze() {
    const result = await api<{ analysis: string }>("/api/analyze/progress", { method: "POST" });
    setAnalysis(result.analysis);
  }

  const latest = metrics[0];
  return (
    <div className="screen-stack">
      <div className="section-heading"><div><span className="eyebrow">DADOS, NÃO PALPITES</span><h1>Laboratório de evolução</h1></div><Button type="primary" icon={<RobotOutlined />} onClick={analyze}>Analisar tendência</Button></div>
      <Row gutter={[16, 16]}>
        {[{ label: "Peso", value: latest?.weightKg, suffix: "kg" }, { label: "Cintura", value: latest?.waistCm, suffix: "cm" }, { label: "Braço", value: latest?.armCm, suffix: "cm" }].map((stat) => (
          <Col xs={8} key={stat.label}><Card bordered={false}><Statistic title={stat.label} value={stat.value ?? "—"} suffix={stat.value ? stat.suffix : ""} /></Card></Col>
        ))}
      </Row>
      <Card title="Nova medição" bordered={false}>
        <Form form={form} layout="vertical"><Row gutter={12}>
          {["weightKg", "waistCm", "armCm", "chestCm", "bodyFat"].map((name) => <Col xs={12} md={8} key={name}><Form.Item name={name} label={({ weightKg: "Peso (kg)", waistCm: "Cintura (cm)", armCm: "Braço (cm)", chestCm: "Peito (cm)", bodyFat: "Gordura (%)" } as Record<string, string>)[name]}><InputNumber min={0} className="full-width" /></Form.Item></Col>)}
        </Row><Button type="primary" onClick={save}>Guardar medição</Button></Form>
      </Card>
      {analysis && <Card title="Leitura da VIGOR" className="analysis-card" bordered={false}><Markdown>{analysis}</Markdown></Card>}
      <Card title="Histórico recente" bordered={false}><List dataSource={metrics.slice(0, 8)} locale={{ emptyText: "Sem medições" }} renderItem={(item) => <List.Item><strong>{item.date}</strong><span>{[item.weightKg && `${item.weightKg} kg`, item.waistCm && `${item.waistCm} cm cintura`, item.armCm && `${item.armCm} cm braço`].filter(Boolean).join(" · ")}</span></List.Item>} /></Card>
    </div>
  );
}

// -.-.-.- Generate nutrition as an actionable plan instead of an open-ended chat prompt.
function FuelPlan() {
  const { message } = App.useApp();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [ingredients, setIngredients] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => { api<MealPlan | null>("/api/plan/meals").then(setPlan).catch(() => undefined); }, []);

  async function generate(useIngredients: boolean) {
    setLoading(true);
    try {
      const body = useIngredients ? { ingredients: ingredients.split(",").map((value) => value.trim()).filter(Boolean) } : {};
      setPlan(await api<MealPlan>("/api/plan/meals", { method: "POST", body: JSON.stringify(body) }));
      message.success("Plano alimentar actualizado.");
    } finally { setLoading(false); }
  }

  return (
    <div className="screen-stack">
      <div className="section-heading"><div><span className="eyebrow">COMBUSTÍVEL</span><h1>Nutrição que acompanha o treino</h1></div><Button type="primary" icon={<RobotOutlined />} loading={loading} onClick={() => generate(false)}>Decidir plano</Button></div>
      <Card title="O que tens em casa?" bordered={false}><Space.Compact block><Input value={ingredients} onChange={(event) => setIngredients(event.target.value)} placeholder="ovos, arroz, frango, banana…" /><Button disabled={!ingredients.trim()} loading={loading} onClick={() => generate(true)}>Criar refeições</Button></Space.Compact></Card>
      {plan?.text ? <Card className="analysis-card" title="Plano actual" bordered={false}><Markdown>{plan.text}</Markdown></Card> : <Empty description="A VIGOR ainda não decidiu o teu plano alimentar." />}
    </div>
  );
}

// -.-.-.- Keep chat as a secondary explanation channel, not the primary product experience.
function VigorCoach() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { api<ChatMsg[]>("/api/coach/chat").then(setMessages).catch(() => undefined); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput(""); setBusy(true);
    setMessages((current) => [...current, { role: "user", content: text }, { role: "assistant", content: "" }]);
    try {
      await streamChat(text, (chunk) => setMessages((current) => {
        const next = [...current];
        next[next.length - 1] = { role: "assistant", content: next[next.length - 1].content + chunk };
        return next;
      }));
    } finally { setBusy(false); }
  }

  return (
    <div className="coach-screen">
      <div className="coach-heading"><Avatar size={52} className="vigor-avatar" icon={<RobotOutlined />} /><div><span className="eyebrow">EXPLICA AS DECISÕES</span><h1>Conversa com a VIGOR</h1></div></div>
      <div className="message-stream">
        {!messages.length && <Empty description="Pergunta por que razão o plano mudou ou pede uma alternativa." />}
        {messages.map((item, index) => <div key={index} className={`message ${item.role}`}><Markdown>{item.content || "…"}</Markdown></div>)}
        <div ref={endRef} />
      </div>
      <Space.Compact block className="coach-composer"><Input value={input} disabled={busy} onChange={(event) => setInput(event.target.value)} onPressEnter={send} placeholder="Pergunta sobre uma decisão…" /><Button type="primary" loading={busy} onClick={send}>Enviar</Button></Space.Compact>
    </div>
  );
}

// -.-.-.- Edit the personal context that powers every autonomous decision.
function ProfileDrawer({ open, profile, onClose, onSaved }: { open: boolean; profile: Profile | null; onClose: () => void; onSaved: (profile: Profile) => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  useEffect(() => {
    if (open) form.setFieldsValue({ ...profile, equipment: profile?.equipment?.join(", ") });
  }, [form, open, profile]);

  async function save() {
    const values = await form.validateFields();
    const payload = {
      ...values,
      equipment: String(values.equipment ?? "").split(",").map((item) => item.trim()).filter(Boolean),
    };
    const saved = await api<Profile>("/api/profile", { method: "PUT", body: JSON.stringify(payload) });
    onSaved(saved); onClose(); message.success("Perfil actualizado. As próximas decisões vão reflectir estes dados.");
  }

  return (
    <Drawer title="O teu contexto" open={open} onClose={onClose} width={520} extra={<Button type="primary" onClick={save}>Guardar</Button>}>
      <p className="drawer-intro">A VIGOR usa estes dados para treino, nutrição e recuperação. Não substitui aconselhamento médico.</p>
      <Form form={form} layout="vertical"><Row gutter={12}>
        <Col span={24}><Form.Item name="name" label="Nome"><Input /></Form.Item></Col>
        <Col span={12}><Form.Item name="age" label="Idade"><InputNumber min={14} max={100} className="full-width" /></Form.Item></Col>
        <Col span={12}><Form.Item name="sex" label="Sexo"><Segmented block options={[{ label: "Homem", value: "M" }, { label: "Mulher", value: "F" }]} /></Form.Item></Col>
        <Col span={12}><Form.Item name="heightCm" label="Altura (cm)"><InputNumber min={120} max={230} className="full-width" /></Form.Item></Col>
        <Col span={12}><Form.Item name="weightKg" label="Peso (kg)"><InputNumber min={35} max={300} className="full-width" /></Form.Item></Col>
        <Col span={24}><Form.Item name="goal" label="Objectivo"><TextArea rows={3} /></Form.Item></Col>
        <Col span={12}><Form.Item name="experience" label="Experiência"><Segmented block options={["iniciante", "intermediario", "avancado"]} /></Form.Item></Col>
        <Col span={12}><Form.Item name="daysPerWeek" label="Dias por semana"><InputNumber min={1} max={7} className="full-width" /></Form.Item></Col>
        <Col span={24}><Form.Item name="dietStyle" label="Estilo alimentar"><Input placeholder="Omnívoro, vegetariano…" /></Form.Item></Col>
        <Col span={24}><Form.Item name="equipment" label="Equipamento"><Input placeholder="Ginásio completo, halteres…" /></Form.Item></Col>
      </Row></Form>
    </Drawer>
  );
}
