import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Layers3 } from "lucide-react";
import {
  levelOrder,
  levels,
  nextQuestion,
  recommendLevel,
  type Answers,
  type LevelId,
} from "../content/paths";
import { getRun, model, percentId, visible } from "./investigation-data";
import { distribution, forward } from "../simulation/story/engine.mjs";
import { navigate, readJourney, writeJourney } from "./journey-state";
import "./investigation.css";
import "./journey.css";

function useAnswerSample() {
  return useMemo(() => {
    const run = getRun("blue"),
      color = run.steps[2],
      trace = forward(color.ids, model),
      focus = trace.blocks[1].heads[1].A.at(-1);
    return {
      tokens: run.output.map((id: number) => ({
        id,
        text: model.vocab[id],
      })),
      probability: distribution(trace.lastLogits).probabilities[color.token],
      logit: trace.lastLogits[color.token],
      focus: Math.max(...focus),
    };
  }, []);
}

// The same answer as each level will come to read it. Every value is live.
function AnswerLens({ lens }: { lens: LevelId }) {
  const sample = useAnswerSample();
  return (
    <div className="gate-lens" data-lens={lens}>
      <p className="gate-lens-words" aria-hidden={lens !== "pemula"}>
        di laci biru.
      </p>
      <ol className="gate-lens-tokens" aria-hidden={lens !== "menengah"}>
        {sample.tokens.map((token: { id: number; text: string }) => (
          <li key={token.id}>
            <code>{visible(token.text)}</code>
            <small>id {token.id}</small>
          </li>
        ))}
      </ol>
      <dl className="gate-lens-math" aria-hidden={lens !== "mahir"}>
        <div>
          <dt>p(“·biru” | konteks)</dt>
          <dd>{percentId(sample.probability)}</dd>
        </div>
        <div>
          <dt>logit</dt>
          <dd>{sample.logit.toFixed(2).replace(".", ",")}</dd>
        </div>
        <div>
          <dt>attention blok 2, head 2</dt>
          <dd>{percentId(sample.focus)}</dd>
        </div>
      </dl>
    </div>
  );
}

function LevelCards({
  recommended,
  onLens,
  onPick,
}: {
  recommended?: LevelId;
  onLens?: (level: LevelId) => void;
  onPick: (level: LevelId) => void;
}) {
  return (
    <div className="gate-levels">
      {levelOrder.map((id) => {
        const level = levels[id];
        return (
          <article
            key={id}
            className={recommended === id ? "recommended" : ""}
            onMouseEnter={() => onLens?.(id)}
            onFocus={() => onLens?.(id)}
          >
            {recommended === id && (
              <span className="story-chip">Saran untukmu</span>
            )}
            <h2>
              {level.name}
              <small>{level.audience}</small>
            </h2>
            <p>{level.who}</p>
            <p className="gate-learn">{level.learn}</p>
            <small>{level.duration} · perkiraan</small>
            <button
              className={recommended === id ? "story-primary" : ""}
              onClick={() => onPick(id)}
            >
              Mulai jalur {level.name}
              <ArrowRight size={15} />
            </button>
          </article>
        );
      })}
    </div>
  );
}

export default function Onboarding() {
  const [stage, setStage] = useState<"intro" | "quiz" | "result">("intro");
  const [answers, setAnswers] = useState<Answers>({});
  const [lens, setLens] = useState<LevelId>("pemula");
  const heading = useRef<HTMLHeadingElement>(null);
  const question = nextQuestion(answers);
  const asked = Object.keys(answers).length;
  const saved = useMemo(readJourney, []);
  const recommended = recommendLevel(answers);

  useEffect(() => {
    document.title = "Pilih level belajar | NeuroLab";
  }, []);
  useEffect(() => {
    if (stage !== "intro") heading.current?.focus({ preventScroll: true });
  }, [stage, asked]);

  function pick(level: LevelId) {
    writeJourney({ ...readJourney(), level });
    navigate({ level });
  }
  function answer(index: number) {
    const next = { ...answers, [question!.id]: index };
    setAnswers(next);
    if (!nextQuestion(next)) setStage("result");
  }
  function back() {
    const entries = Object.entries(answers);
    if (!entries.length) return setStage("intro");
    setAnswers(Object.fromEntries(entries.slice(0, -1)));
    setStage("quiz");
  }

  return (
    <main className="investigation gate">
      <header className="gate-top">
        <a href="/id/" className="story-brand">
          <span className="story-mark">
            <Layers3 size={23} />
          </span>
          <span>
            NEUROLAB<small>DI BALIK SATU JAWABAN</small>
          </span>
        </a>
        <span className="gate-top-actions">
          <button onClick={() => navigate({})}>Kembali ke game</button>
          {saved.level && (
            <button onClick={() => navigate({ level: saved.level! })}>
              Lanjutkan jalur {levels[saved.level].name}
            </button>
          )}
        </span>
      </header>

      {stage === "intro" && (
        <>
          <section className="gate-hero">
            <p className="gate-kicker">
              Model mini di browsermu baru saja membaca sebuah catatan dan
              menjawab:
            </p>
            <AnswerLens lens={lens} />
            <h1>Seberapa dalam kamu ingin membongkar jawaban ini?</h1>
            <div className="gate-cta">
              <button
                className="story-primary"
                onClick={() => setStage("quiz")}
              >
                Bantu pilihkan levelku
                <ArrowRight size={16} />
              </button>
              <span>Maksimal 4 pertanyaan, tanpa nilai.</span>
            </div>
          </section>
          <section aria-label="Pilih level langsung" className="gate-section">
            <p className="gate-kicker">Atau pilih langsung</p>
            <LevelCards onLens={setLens} onPick={pick} />
            <p className="gate-classic">
              Sudah pernah ke sini?{" "}
              <a
                href="?lesson=0"
                onClick={(e) => {
                  e.preventDefault();
                  navigate({ lesson: 0 });
                }}
              >
                Buka investigasi lengkap 14 pos
              </a>
            </p>
          </section>
        </>
      )}

      {stage === "quiz" && question && (
        <section className="gate-quiz">
          <p className="gate-kicker">Pertanyaan {asked + 1}</p>
          <h1 ref={heading} tabIndex={-1}>
            {question.text}
          </h1>
          {question.code && <pre>{question.code}</pre>}
          <div className="gate-options">
            {question.options.map((option, index) => (
              <button key={option.label} onClick={() => answer(index)}>
                {option.label}
              </button>
            ))}
          </div>
          <p>
            “Belum tahu” adalah jawaban yang baik. Pilihanmu hanya menentukan
            titik mulai.
          </p>
          <button className="story-text-button" onClick={back}>
            <ArrowLeft size={15} />
            Kembali
          </button>
        </section>
      )}

      {stage === "result" && (
        <section className="gate-section gate-result">
          <p className="gate-kicker">
            <Check size={15} /> Titik mulai yang kami sarankan
          </p>
          <h1 ref={heading} tabIndex={-1}>
            {levels[recommended].name} · {levels[recommended].audience}
          </h1>
          <p>{levels[recommended].reason} Kamu bisa ganti level kapan saja.</p>
          <LevelCards recommended={recommended} onPick={pick} />
          <button className="story-text-button" onClick={back}>
            <ArrowLeft size={15} />
            Ubah jawaban terakhir
          </button>
        </section>
      )}
    </main>
  );
}
