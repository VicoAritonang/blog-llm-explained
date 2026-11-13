import { useState } from "react";
import { ArrowRight, RotateCcw, X } from "lucide-react";
import { exams } from "./exams";
import { levelNames, XP } from "./progress";

export function GateExam({
  gate,
  open,
  onPass,
  onClose,
}: {
  gate: number;
  open: boolean;
  onPass: (gate: number) => void;
  onClose: () => void;
}) {
  const questions = exams[gate];
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [state, setState] = useState<"intro" | "run" | "fail" | "pass">(open ? "pass" : "intro");
  const q = questions[i];
  const next = levelNames[gate + 2];

  function choose(n: number) {
    if (picked !== null) return;
    setPicked(n);
  }
  function advance() {
    if (picked !== q.answer) return setState("fail");
    if (i + 1 === questions.length) {
      setState("pass");
      onPass(gate);
      return;
    }
    setI(i + 1);
    setPicked(null);
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="exam-title">
      <section className="panel exam">
        <header className="panel-head">
          <div>
            <small>TERMINAL GERBANG {gate + 1}</small>
            <h2 id="exam-title">Ujian lompat ke Level {gate + 2}</h2>
          </div>
          <button className="icon-close" onClick={onClose} aria-label="Tutup ujian">
            <X size={20} />
          </button>
        </header>

        {state === "intro" && (
          <div className="exam-body">
            <p>
              Sudah paham materi Level {gate + 1}? Jawab {questions.length} pertanyaan dengan benar
              semuanya, dan gerbang ke Level {gate + 2} · {next} langsung terbuka.
            </p>
            <p className="muted">
              Quest di area ini tetap bisa dikerjakan kapan saja. Satu jawaban salah berarti ujian
              diulang dari awal.
            </p>
            <button className="btn-gold" onClick={() => setState("run")}>
              Mulai ujian <ArrowRight size={16} />
            </button>
          </div>
        )}

        {state === "run" && (
          <div className="exam-body">
            <div className="exam-progress" aria-label={`Pertanyaan ${i + 1} dari ${questions.length}`}>
              {questions.map((_, n) => (
                <i key={n} className={n < i ? "past" : n === i ? "on" : ""} />
              ))}
            </div>
            <p className="quiz-q">{q.q}</p>
            <div className="quiz-options">
              {q.options.map((option, n) => (
                <button
                  key={option}
                  className={picked === n ? (n === q.answer ? "right" : "wrong") : ""}
                  disabled={picked !== null && picked !== n}
                  onClick={() => choose(n)}
                >
                  <span>{String.fromCharCode(65 + n)}</span>
                  {option}
                </button>
              ))}
            </div>
            {picked !== null && (
              <>
                <p className={`quiz-why ${picked === q.answer ? "right" : "wrong"}`} role="status">
                  <b>{picked === q.answer ? "Tepat." : "Belum tepat."}</b> {q.why}
                </p>
                <button className="btn-gold" onClick={advance}>
                  {picked === q.answer ? (i + 1 === questions.length ? "Selesaikan" : "Lanjut") : "Lihat hasil"}
                  <ArrowRight size={16} />
                </button>
              </>
            )}
          </div>
        )}

        {state === "fail" && (
          <div className="exam-body">
            <p className="exam-result fail">Gerbang belum terbuka.</p>
            <p>
              Tidak apa-apa. Pertanyaan tadi dibahas langsung di quest area ini, dan setiap quest
              memberi XP.
            </p>
            <div className="row">
              <button
                onClick={() => {
                  setI(0);
                  setPicked(null);
                  setState("run");
                }}
              >
                <RotateCcw size={15} /> Ulangi ujian
              </button>
              <button className="btn-gold" onClick={onClose}>
                Kerjakan quest
              </button>
            </div>
          </div>
        )}

        {state === "pass" && (
          <div className="exam-body">
            <p className="exam-result pass">Gerbang ke Level {gate + 2} terbuka!</p>
            <p>
              {open ? "Kamu sudah membuka gerbang ini." : `+${XP.exam} XP.`} Area {next} menunggu di
              balik gerbang.
            </p>
            <button className="btn-gold" onClick={onClose}>
              Kembali ke dunia <ArrowRight size={16} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
