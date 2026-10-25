import { t } from "../i18n/core.mjs";
import {
  Flag,
  Trophy,
  ArrowRight,
  Wrench,
  FlaskConical,
  Check,
  RotateCcw,
} from "lucide-react";
import { missions } from "../simulation/playground.mjs";
import { usePlayground } from "../store/playground";
import { useGame } from "../store/game";
import type { StationId } from "../content/lessons";
import { useEffect, useRef } from "react";
import { useExperience } from "../store/experience";
import "./missions.css";

export function MissionTracker() {
  const p = usePlayground(),
    g = useGame(),
    m = missions.find((m) => m.id === p.active);
  return (
    <aside
      className={`mission-tracker ${g.guide ? "hint-open" : ""}`}
      aria-label={t("Misi aktif")}
    >
      <button onClick={() => g.openPanel("missions")}>
        <Flag size={14} />
        <span>{m ? m.title : t("Enam tantangan menunggu")}</span>
        <b>{p.completed.length}/6</b>
      </button>
      <small>
        {m
          ? `${m.parameter}: ${m.options[p.settings[m.id]]}`
          : t("Ubah alat → prediksi → uji → temukan")}
      </small>
      {m && (
        <p>
          {t("Kalibrator [5] + E mengubah model.")}{" "}
          <button onClick={() => g.openPanel("missions")}>
            {t("Prediksi & uji [F] →")}
          </button>
        </p>
      )}
    </aside>
  );
}
export default function MissionsPanel() {
  const p = usePlayground(),
    g = useGame(),
    m = missions.find((m) => m.id === p.active),
    trial = m ? p.trials[m.id] : null;
  const mode = useExperience((s) => s.mode);
  const result = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (trial) result.current?.scrollIntoView({ block: "nearest" });
  }, [trial]);
  return (
    <div className="missions-panel">
      <div className="mission-intro">
        <FlaskConical size={25} />
        <div>
          <h3>{t("Belajar dengan mengutak-atik.")}</h3>
          <p>
            {t(
              "Ubah model 3D, prediksi akibatnya, lalu uji. Tidak ada penalti untuk percobaan yang gagal.",
            )}
          </p>
        </div>
      </div>
      <div className="discovery-meter">
        <Trophy size={16} />
        <b>{t("{0} / 6 penemuan", p.completed.length)}</b>
        <progress
          value={p.completed.length}
          max={6}
          aria-label={t("Penemuan selesai")}
        />
        <span>
          {p.completed.length === 6 ? "MASTER OF THE LAB" : "FIELD RESEARCHER"}
        </span>
      </div>
      <div className="mission-picker" aria-label={t("Pilih misi")}>
        {missions.map((item) => (
          <button
            key={item.id}
            aria-pressed={p.active === item.id}
            onClick={() => {
              p.start(item.id);
              g.travel(item.station as StationId);
              g.equip("tuner");
              g.openPanel("missions");
            }}
          >
            <span>
              {p.completed.includes(item.id) ? (
                <Check size={15} />
              ) : (
                item.tag.slice(0, 2)
              )}
            </span>
            <b>{item.title}</b>
          </button>
        ))}
      </div>
      {m ? (
        <section
          className="mission-console"
          aria-label={t("Konsol eksperimen")}
        >
          <div className="mission-heading">
            <div>
              <small>{m.tag}</small>
              <h3>{m.title}</h3>
            </div>
            <button onClick={() => g.openPanel(null)}>
              <Wrench size={14} />{" "}
              {mode === "3d" ? t("Lihat model 3D") : t("Kembali ke diagram")}{" "}
              <ArrowRight size={14} />
            </button>
          </div>
          <p className="mission-goal">{m.goal}</p>
          <fieldset>
            <legend>
              {t("1. Ubah")} {m.parameter.toLowerCase()}
            </legend>
            <div className="experiment-options">
              {m.options.map((option, i) => (
                <label key={option}>
                  <input
                    type="radio"
                    name="configuration"
                    checked={p.settings[m.id] === i}
                    onChange={() => p.configure(m.id, i)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="experiment-reading">
            <span>{t("TERAMATI / FIXTURE ILUSTRATIF")}</span>
            <b>{m.readings[p.settings[m.id]]}</b>
          </div>
          <fieldset>
            <legend>{t("2. Prediksi apa yang terjadi")}</legend>
            <div className="prediction-options">
              {m.choices.map((choice, i) => (
                <label key={choice}>
                  <input
                    type="radio"
                    name="prediction"
                    checked={p.predictions[m.id] === i}
                    onChange={() => p.predict(m.id, i)}
                  />
                  <span>{choice}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="experiment-actions">
            <button className="trial-run" onClick={p.run}>
              <FlaskConical size={16} />
              {t("Jalankan uji")}
            </button>
            <button onClick={() => p.configure(m.id, 0)}>
              <RotateCcw size={14} />
              {t("Reset konfigurasi")}
            </button>
          </div>
          {trial && (
            <div
              ref={result}
              className={`trial-result ${trial.passed ? "passed" : ""}`}
              role="status"
            >
              <b>
                {trial.passed
                  ? t("Penemuan terverifikasi!")
                  : t("Coba lagi: periksa hubungan sebab-akibat")}
              </b>
              <p>{trial.reason}</p>
              {trial.passed && (
                <small>
                  <Trophy size={14} /> {m.tag.split(" / ")[1]}
                  {t("· lencana tersimpan di browser ini")}
                </small>
              )}
            </div>
          )}
        </section>
      ) : (
        <div className="mission-empty">
          <Flag size={32} />
          <h3>{t("Pilih tantangan pertama.")}</h3>
          <p>
            {t(
              "Kamu akan berpindah ke instrumennya dengan Kalibrator di tangan. Semua tantangan terbuka sejak awal.",
            )}
          </p>
        </div>
      )}
      <p className="sandbox-note">
        {t(
          "Model eksperimen memakai fixture terpisah dari workbench angka. Mode tanpa mask dan tanpa residual sengaja menunjukkan kondisi yang tidak sesuai arsitektur referensi. Buka Catatan untuk mekanisme dan perhitungan mainan; pilih alat 1–4 untuk melihat instrumen utama kembali.",
        )}
      </p>
    </div>
  );
}
