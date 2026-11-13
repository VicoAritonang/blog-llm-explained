import { useMemo, useRef, useState } from "react";
import { visible } from "../investigation-data";
import {
  encode,
  mixes,
  probes,
  tokensPerWord,
  trainBPE,
} from "../../simulation/bpe.mjs";
import type { LabProps } from "./index";

type Mix = keyof typeof mixes;
const decimal = (n: number) => n.toFixed(2).replace(".", ",");

export function BpeLab({ complete }: LabProps) {
  const [mix, setMix] = useState<Mix>("mixed");
  const [steps, setSteps] = useState(0);
  const [text, setText] = useState("Belajar tokenisasi itu menyenangkan");
  const seen = useRef(new Set<Mix>());
  const merges = useMemo(() => trainBPE(mixes[mix].corpus), [mix]);
  const applied = Math.min(steps, merges.length);
  const tokens = encode(text, merges, applied);
  const recent = merges.slice(Math.max(0, applied - 4), applied).reverse();

  function apply(next: number) {
    setSteps(next);
    if (next >= 5) complete("bpe-merge");
  }
  function retrain(next: Mix) {
    setMix(next);
    seen.current.add(next);
    if (seen.current.has("en") && seen.current.has("id"))
      complete("bpe-bahasa");
  }
  return (
    <div className="lab">
      <fieldset className="lab-segments">
        <legend>Data latih tokenizer</legend>
        {(Object.keys(mixes) as Mix[]).map((key) => (
          <label
            className={`story-radio ${mix === key ? "checked" : ""}`}
            key={key}
          >
            <input
              type="radio"
              name="bpe-mix"
              checked={mix === key}
              onChange={() => retrain(key)}
            />
            {mixes[key].label}
          </label>
        ))}
      </fieldset>
      <div className="lab-panel">
        <label className="story-reflection">
          Teks yang ditokenisasi
          <textarea
            rows={2}
            maxLength={300}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              complete("bpe-teks");
            }}
          />
        </label>
        <div className="lab-tokens" data-testid="bpe-tokens">
          {tokens.map((token: string, i: number) => (
            <code key={i}>{visible(token)}</code>
          ))}
        </div>
        <p className="story-result" role="status">
          {tokens.length} token dari {[...text].length} karakter.{" "}
          {tokens.join("") === text
            ? "Rekonstruksi persis."
            : "Rekonstruksi berbeda."}
        </p>
        <label className="lab-slider">
          Merge diterapkan
          <input
            type="range"
            min={0}
            max={merges.length}
            value={applied}
            onChange={(e) => apply(Number(e.target.value))}
          />
          <b>
            {applied} / {merges.length}
          </b>
        </label>
        <div className="story-actions">
          <button
            className="story-primary"
            disabled={applied >= merges.length}
            onClick={() => apply(applied + 1)}
          >
            Merge berikutnya
          </button>
          <button onClick={() => apply(merges.length)}>Semua merge</button>
          <button onClick={() => apply(0)}>Kembali ke karakter</button>
        </div>
        {recent.length > 0 && (
          <table>
            <caption>Merge terakhir</caption>
            <thead>
              <tr>
                <th scope="col">Pasangan</th>
                <th scope="col">Hasil</th>
                <th scope="col">Frekuensi</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((merge: (typeof merges)[number]) => (
                <tr key={merge.merged + merge.count}>
                  <th scope="row">
                    <code>
                      {visible(merge.left)} + {visible(merge.right)}
                    </code>
                  </th>
                  <td>
                    <code>{visible(merge.merged)}</code>
                  </td>
                  <td>{merge.count}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="lab-panel">
        <h3>Kalimat yang sama, dua bahasa</h3>
        <small>
          Dihitung dengan semua {merges.length} merge. Kedua kalimat tidak ada
          di data latih.
        </small>
        <table data-testid="bpe-compare">
          <thead>
            <tr>
              <th scope="col">Kalimat uji</th>
              <th scope="col">Token</th>
              <th scope="col">Token per kata</th>
            </tr>
          </thead>
          <tbody>
            {(["id", "en"] as const).map((language) => (
              <tr key={language}>
                <th scope="row">
                  {language === "id" ? "Indonesia" : "Inggris"}
                </th>
                <td>{encode(probes[language], merges).length}</td>
                <td>{decimal(tokensPerWord(probes[language], merges))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="lab-limit">
        BPE ini bekerja pada karakter dan dilatih pada 40 kalimat. GPT-2 bekerja
        pada byte dengan vocabulary 50.257, jadi angkanya berbeda, tetapi
        algoritmanya sama.
      </p>
    </div>
  );
}
