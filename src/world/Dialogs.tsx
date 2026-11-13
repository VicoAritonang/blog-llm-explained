import { useEffect, useRef, useState } from "react";
import { ArrowRight, Copy, Lock, MousePointerClick, Navigation, X } from "lucide-react";
import { GuideMark } from "../app/Guide";
import { missions } from "../content/paths";
import { books } from "./books";
import { questObjects, zones, type ZoneId } from "./map";
import { levelNames, levelRanks, type Progress, type WorldSave } from "./progress";

function useFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => ref.current?.focus(), []);
  return ref;
}

export function Intro({ returning, onStart }: { returning: boolean; onStart: () => void }) {
  const start = useFocus<HTMLButtonElement>();
  const touch = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  return (
    <div className="overlay intro-overlay" role="dialog" aria-modal="true" aria-labelledby="intro-title">
      <section className="intro">
        <p className="intro-kicker">GAME SIMULASI · MODEL BAHASA SUNGGUHAN DI BROWSERMU</p>
        <h2 id="intro-title">
          Neuro<span>Lab</span>
        </h2>
        <p className="intro-lead">
          Masuk ke dalam mesin yang menjawab pertanyaanmu. Selesaikan quest berisi simulasi, kumpulkan
          XP, dan buka gerbang dari Pemula sampai Arsitek LLM.
        </p>
        <ol className="intro-steps">
          <li>
            <b>Jelajahi</b>
            <span>{touch ? "Ketuk lantai untuk berjalan, ketuk benda untuk memakainya." : "WASD / panah untuk berjalan, E untuk berinteraksi. Klik benda juga bisa."}</span>
          </li>
          <li>
            <b>Selesaikan quest</b>
            <span>Mesin bertanda ! berisi simulasi. Tujuannya tercentang dari tindakanmu.</span>
          </li>
          <li>
            <b>Naik level</b>
            <span>Semua quest di satu area membuka gerbang berikutnya. Buku di podium memberi XP tambahan.</span>
          </li>
        </ol>
        <div className="intro-levels" aria-label="Tiga level">
          {[1, 2, 3].map((l) => (
            <span key={l}>
              <b>{l}</b> {zones[l - 1].name}
              <small>{levelNames[l]}</small>
            </span>
          ))}
        </div>
        <button ref={start} className="btn-gold big" onClick={onStart}>
          {returning ? "Lanjutkan permainan" : "Mulai petualangan"} <ArrowRight size={18} />
        </button>
        <p className="intro-alt">
          Lebih suka membaca? <a href="#learning-guide">Panduan teks lengkap ada di bawah halaman ini.</a>
        </p>
      </section>
    </div>
  );
}

const naraIntro: Record<ZoneId, string> = {
  0: "Halo, aku Nara, pemandu lab ini. Di sini tinggal model bahasa mini yang sungguhan: 20.256 angka hasil belajar yang berjalan langsung di browsermu. Setiap mesin bertanda ! adalah quest berisi simulasi. Selesaikan ketujuhnya untuk membuka gerbang ke Pabrik Token.",
  1: "Selamat datang di Pabrik Token. Ban berjalan ini membawa satu kalimat melewati forward pass: teks, ID token, vektor, attention, sampai satu token terpilih. Setiap mesin di pinggir ban membuka satu tahap.",
  2: "Hologram di tengah adalah GPT-3: 96 blok dengan lebar 12.288. Bobotnya tidak dimuat. Semua angka di sini dihitung dari dimensi yang dipublikasikan paper-nya, lalu diuji di model mini.",
  3: "Kamu sudah membongkar seluruh mesin, dari satu token sampai biaya serving. Ambil piala di depan untuk melihat ringkasan perjalananmu.",
};

export function NaraDialog({
  zone,
  progress,
  onGuide,
  onClose,
}: {
  zone: ZoneId;
  progress: Progress;
  onGuide: () => void;
  onClose: () => void;
}) {
  const btn = useFocus<HTMLButtonElement>();
  const [d, t] = progress.zoneQuests(zone);
  const rec = progress.recommended;
  const recName =
    rec?.kind === "quest" ? missions[rec.level].find((m) => m.id === rec.mission)?.short : null;
  let line = naraIntro[zone];
  if (zone < 3 && d > 0 && d < t)
    line = `Sudah ${d} dari ${t} quest di ${zones[zone].name}. ${recName ? `Berikutnya: “${recName}”. Ikuti panah kuning.` : ""}`;
  if (zone < 3 && d === t && t > 0)
    line = `${zones[zone].name} tuntas! Gerbang ke ${zones[zone + 1].name} sudah terbuka.${recName ? ` Quest berikutnya: “${recName}”.` : ""}`;
  return (
    <div className="overlay dialog-overlay" role="dialog" aria-modal="true" aria-label="Nara">
      <section className="nara-dialog">
        <GuideMark size={56} />
        <div>
          <small>NARA · PEMANDU LAB</small>
          <p>{line}</p>
          <div className="row">
            {rec && (
              <button ref={btn} className="btn-gold" onClick={onGuide}>
                <Navigation size={15} /> Antar aku ke sana
              </button>
            )}
            <button ref={rec ? undefined : btn} onClick={onClose}>
              Aku jelajahi sendiri
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function GateNotice({
  gate,
  done,
  onExam,
  onGuide,
  onClose,
}: {
  gate: number;
  done: [number, number];
  onExam: () => void;
  onGuide: () => void;
  onClose: () => void;
}) {
  const btn = useFocus<HTMLButtonElement>();
  return (
    <div className="overlay dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <section className="nara-dialog gate-dialog">
        <span className="gate-icon">
          <Lock size={26} />
        </span>
        <div>
          <small>GERBANG LEVEL {gate + 2}</small>
          <h2 id="gate-title">{zones[gate + 1].name} masih terkunci</h2>
          <p>
            Selesaikan semua quest di {zones[gate].name} ({done[0]}/{done[1]}), atau buktikan kamu sudah
            paham lewat ujian lompat.
          </p>
          <div className="gate-meter">
            <i style={{ width: `${(done[0] / done[1]) * 100}%` }} />
          </div>
          <div className="row">
            <button ref={btn} className="btn-gold" onClick={onGuide}>
              <Navigation size={15} /> Quest berikutnya
            </button>
            <button onClick={onExam}>Ujian lompat</button>
            <button className="ghost" onClick={onClose}>
              Tutup
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function LevelUp({ level, onClose }: { level: number; onClose: () => void }) {
  const btn = useFocus<HTMLButtonElement>();
  const zone = zones[Math.min(level - 1, 3)];
  return (
    <div className="overlay levelup-overlay" role="dialog" aria-modal="true" aria-labelledby="lvl-title">
      <section className="levelup">
        <div className="levelup-burst" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} style={{ ["--i" as string]: i }} />
          ))}
        </div>
        <p className="levelup-kicker">LEVEL UP!</p>
        <div className="levelup-badge">
          <small>LV</small>
          <b id="lvl-title">{level}</b>
        </div>
        <h2>{levelRanks[level]}</h2>
        <p>
          {level < 4
            ? `Gerbang ke ${zone.name} terbuka. ${zone.tagline}.`
            : "Semua gerbang terbuka. Aula Arsitek menunggumu."}
        </p>
        <button ref={btn} className="btn-gold big" onClick={onClose}>
          Menuju gerbang <ArrowRight size={18} />
        </button>
      </section>
    </div>
  );
}

export function Certificate({
  progress,
  save,
  onClose,
}: {
  progress: Progress;
  save: WorldSave;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const btn = useFocus<HTMLButtonElement>();
  const date = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const summary = `Aku menyelesaikan NeuroLab sebagai ${levelRanks[progress.level]}: ${progress.questsDone}/${questObjects.length} quest, ${save.books.length} buku, ${progress.xp} XP. https://llm-explained.vicoworks.com/id/`;
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="cert-title">
      <section className="certificate">
        <button className="icon-close" onClick={onClose} aria-label="Tutup">
          <X size={20} />
        </button>
        <small>NEUROLAB · SERTIFIKAT PERJALANAN</small>
        <h2 id="cert-title">{levelRanks[progress.level]}</h2>
        <p>
          telah menelusuri model bahasa dari satu token sampai skala 175 miliar parameter, dengan
          simulasi yang berjalan di browser.
        </p>
        <dl>
          <div>
            <dt>Quest</dt>
            <dd>
              {progress.questsDone}/{questObjects.length}
            </dd>
          </div>
          <div>
            <dt>Buku</dt>
            <dd>
              {save.books.length}/{Object.keys(books).length}
            </dd>
          </div>
          <div>
            <dt>XP</dt>
            <dd>{progress.xp}</dd>
          </div>
        </dl>
        <p className="muted">{date}</p>
        {progress.questsDone < questObjects.length && (
          <p className="muted">
            Beberapa gerbang kamu buka lewat ujian lompat. Quest yang tersisa tetap bisa dikerjakan.
          </p>
        )}
        <div className="row">
          <button
            ref={btn}
            className="btn-gold"
            onClick={() => {
              navigator.clipboard?.writeText(summary).then(
                () => setCopied(true),
                () => setCopied(false),
              );
            }}
          >
            <Copy size={15} /> {copied ? "Tersalin" : "Salin ringkasan"}
          </button>
          <button onClick={onClose}>
            <MousePointerClick size={15} /> Kembali menjelajah
          </button>
        </div>
      </section>
    </div>
  );
}
