import { t } from "../i18n/core.mjs";
import { ArrowRight, BookOpen, Layers3 } from "lucide-react";
import { architecture, modelReference } from "../content/architecture";
import { stations } from "../content/lessons";
import { useExperience } from "../store/experience";

export function ModelBanner() {
  return (
    <section
      className="model-banner"
      aria-label={t("Referensi arsitektur GPT-3")}
    >
      <div className="model-name">
        <Layers3 size={21} />
        <div>
          <small>ARCHITECTURE FIELD GUIDE</small>
          <strong>{modelReference.name}</strong>
        </div>
      </div>
      <div className="model-stats">
        <span>
          <b>96</b>
          {t("blok")}
        </span>
        <span>
          <b>96</b>
          {t("head / blok")}
        </span>
        <span>
          <b>12.288</b>
          {t("dimensi")}
        </span>
        <span>
          <b>2.048</b>
          {t("konteks")}
        </span>
      </div>
      <a href={modelReference.source} target="_blank" rel="noreferrer">
        {t("Paper referensi ↗")}
      </a>
    </section>
  );
}

export default function ArchitectureGuide() {
  const s = useExperience(),
    item = architecture[s.station];
  return (
    <section
      className="architecture-guide"
      aria-label={t("Panduan arsitektur")}
    >
      <div className="architecture-narrative">
        <span className="section-kicker">{item.label}</span>
        <h2>{stations.find((st) => st.id === s.station)!.question}</h2>
        <p>{item.story}</p>
      </div>
      <div className="architecture-reading">
        <span className="architecture-shape">{item.shape}</span>
        <p>
          <BookOpen size={15} />
          {item.watch}
        </p>
        <div className="operation-chips">
          {item.flow.map((step, i) => (
            <span key={step}>
              {i > 0 && <ArrowRight size={12} />}
              <b>{step}</b>
            </span>
          ))}
        </div>
      </div>
      <details className="architecture-footnote">
        <summary>{t("Bagaimana membaca skala dan visual ini?")}</summary>
        <p>
          {t(
            "Diagram memperlihatkan mekanisme decoder-only dengan skala referensi GPT-3 175B. Paper GPT-3 memakai pola attention dense dan locally banded sparse secara bergantian; lab memperlihatkan causal dense attention untuk membedah operasi dasarnya. Titik, warna, kecepatan, dan jarak adalah ilustrasi. Workbench angka di bawah memakai model mainan 2 blok, 2 head, dan lebar 8; bukan aktivasi GPT-3.",
          )}
        </p>
        <p>
          {t(
            "Saat inferensi, bobot tetap. Saat training, prediksi dibandingkan dengan token target melalui cross-entropy; backpropagation dan optimizer memperbarui bobot. Demonstrasi ini berfokus pada inferensi.",
          )}
        </p>
      </details>
    </section>
  );
}
