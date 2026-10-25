import { t } from "../i18n/core.mjs";
import { z } from "zod";
export const TensorSchema = z
  .object({
    id: z.string(),
    shape: z.array(z.number().int().positive()),
    values: z.array(z.number().finite()),
    sourceTensorIds: z.array(z.string()),
    operation: z.string(),
    maskedIndices: z.array(z.number().int().nonnegative()).optional(),
  })
  .refine(
    (t) => t.shape.reduce((a, x) => a * x, 1) === t.values.length,
    t("Shape tidak cocok dengan jumlah nilai"),
  );
export const FixtureSchema = z.object({
  kind: z.literal("pipeline"),
  provenance: z.string(),
  modelProfile: z.object({
    width: z.literal(8),
    heads: z.literal(2),
    headWidth: z.literal(4),
    ff: z.literal(32),
    layers: z.literal(2),
    maxTokens: z.literal(12),
    vocabulary: z.literal(16),
  }),
  tokenizerProfile: z.string(),
  schemaVersion: z.literal(1),
  contentVersion: z.string(),
  seed: z.number().int(),
  inputs: z.object({
    ids: z.array(z.number().int().min(0).max(15)).min(1).max(12),
    text: z.string(),
  }),
  tensors: z.array(TensorSchema),
  steps: z.array(
    z.object({
      id: z.string(),
      station: z.string(),
      durationMs: z.number().positive(),
      fromTensorIds: z.array(z.string()),
      toTensorIds: z.array(z.string()),
      narrationKey: z.string(),
    }),
  ),
});
