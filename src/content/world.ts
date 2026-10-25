import { t } from "../i18n/core.mjs";
import type { StationId } from "./lessons";

export type Point3 = [number, number, number];
export const worldStations: Record<
  StationId,
  { position: Point3; yaw: number; zone: string }
> = {
  tokenizer: { position: [-12, 0, -5], yaw: 0, zone: "INPUT BAY" },
  embedding: { position: [-4, 0, -5], yaw: 0, zone: "VECTOR CHAMBER" },
  qkv: { position: [4, 0, -5], yaw: 0, zone: "PROJECTION ARRAY" },
  attention: { position: [12, 0, -5], yaw: 0, zone: "CONTEXT ENGINE" },
  transformer: { position: [12, 0, 7], yaw: Math.PI, zone: "TRANSFORMER CORE" },
  sampling: { position: [4, 0, 7], yaw: Math.PI, zone: "OUTPUT TERMINAL" },
  cache: { position: [-4, 0, 7], yaw: Math.PI, zone: "MEMORY VAULT" },
  analogy: { position: [-12, 0, 7], yaw: Math.PI, zone: "VECTOR ANNEX" },
};
export const fieldTools = [
  {
    id: "scanner",
    key: "1",
    name: t("Pemindai"),
    short: "SCAN",
    color: "#8be5ca",
    action: t("Pindai instrumen"),
    description: t(
      "Arahkan ke instrumen untuk membaca mekanisme, angka, dan kode di catatan lapangan.",
    ),
  },
  {
    id: "token",
    key: "2",
    name: t("Pelacak token"),
    short: "TRACE",
    color: "#f1c57e",
    action: t("Lacak token berikutnya"),
    description: t(
      "Pilih satu posisi token. Sorotan pada matriks dan jalur attention mengikuti token itu.",
    ),
  },
  {
    id: "lens",
    key: "3",
    name: t("Lensa head"),
    short: "HEAD",
    color: "#c3adff",
    action: t("Ganti attention head"),
    description: t(
      "Gunakan pada Q/K/V, attention, atau Transformer untuk membandingkan dua head demo.",
    ),
  },
  {
    id: "time",
    key: "4",
    name: t("Pengendali waktu"),
    short: "TIME",
    color: "#8bd6f4",
    action: t("Jeda / jalankan sinyal"),
    description: t(
      "Bekukan aliran sinyal di seluruh lab. Tekan R untuk maju satu operasi dan periksa perubahannya.",
    ),
  },
  {
    id: "tuner",
    key: "5",
    name: t("Kalibrator"),
    short: "TUNE",
    color: "#ffc18b",
    action: t("Ubah konfigurasi eksperimen"),
    description: t(
      "Ubah model eksperimen dengan E. Buka Misi [F] untuk membuat prediksi, menguji, dan meraih lencana.",
    ),
  },
] as const;
export type ToolId = (typeof fieldTools)[number]["id"];
export const toolHints: Record<StationId, string> = {
  tokenizer: t(
    "Pilih Pemindai [1], arahkan bidikan ke kapsul, lalu tekan E. Perhatikan bahwa ID token berbeda dari posisi token.",
  ),
  embedding: t(
    "Pilih Pelacak token [2], lalu tekan E. Lihat bagaimana satu baris embedding mewakili token yang sedang dibawa.",
  ),
  qkv: t(
    "Pilih Lensa head [3], lalu tekan E. Query, Key, dan Value berasal dari input yang sama melalui tiga proyeksi berbeda.",
  ),
  attention: t(
    "Gunakan Pelacak token [2] untuk mengganti Query, lalu Lensa head [3] untuk membandingkan pola. Posisi masa depan tetap tertutup.",
  ),
  transformer: t(
    "Gunakan Pengendali waktu [4] untuk menjeda. Tekan R untuk menelusuri residual, normalisasi, ekspansi MLP, GELU, dan proyeksi balik.",
  ),
  sampling: t(
    "Pindai terminal [1]. Di tab Eksperimen, ubah temperature, pilih token, lalu tambahkan ke urutan. Probabilitas bukan kepastian fakta.",
  ),
  cache: t(
    "Pindai rak [1] dan buka Eksperimen. Bandingkan prefill dan decode: K/V lama dipakai ulang, Query token baru tetap dihitung.",
  ),
  analogy: t(
    "Pindai annex [1]. Hubungan vektor ini adalah ilustrasi embedding statis, terpisah dari jalur inferensi Transformer.",
  ),
};
