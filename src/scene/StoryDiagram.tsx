import { useMemo } from "react";
import type { StorySceneProps } from "./InvestigationScene";
const cyan = "#6fe6d4",
  amber = "#f4b779";
export function StoryDiagram({
  trace,
  position,
  layer,
  head,
  onPosition,
  vocab,
  lesson,
}: StorySceneProps) {
  const nodes = useMemo(
    () =>
      trace.ids.map((id: number, i: number) => ({
        id,
        i,
        x: 35 + (i * 650) / Math.max(1, trace.ids.length - 1),
      })),
    [trace.ids],
  );
  const row = trace.blocks[layer].heads[head].A[position];
  return (
    <svg
      viewBox="0 0 720 260"
      role="img"
      aria-label="Diagram posisi dari kiri ke kanan, layer dari bawah ke atas"
      className="story-diagram"
    >
      <text x="18" y="23" fill="#a8c3cb" fontSize="12">
        Skema operasi · kiri → kanan: posisi · bawah → atas: kedalaman
      </text>
      {[0, 1, 2].map((l) => (
        <g key={l}>
          <rect
            x="17"
            y={185 - l * 65}
            width="686"
            height="43"
            rx="7"
            fill="#142a33"
            stroke={l - 1 === layer ? cyan : "#31505d"}
          />
          <text x="25" y={180 - l * 65} fill="#a8c3cb" fontSize="10">
            {l === 0
              ? "E + P"
              : `BLOK ${l}: LN → QKV → ${trace.config.causal ? "mask" : "tanpa mask"} → softmax × V → ${trace.config.residual ? "+" : "×"} → LN → MLP → ${trace.config.residual ? "+" : "×"}`}
          </text>
          {nodes.map(({ i, x }: { i: number; x: number }) => (
            <g
              key={i}
              onClick={() => onPosition(i)}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={x - 7}
                y={198 - l * 65}
                width="14"
                height="16"
                rx="3"
                fill={i === position ? "#fff" : cyan}
              />
              <title>{`pos ${i} · id ${trace.ids[i]} · ${vocab[trace.ids[i]]}`}</title>
              {l === 0 && (
                <text
                  x={x}
                  y="245"
                  textAnchor="middle"
                  fill="#b7ced3"
                  fontSize="9"
                >
                  {i}
                </text>
              )}
            </g>
          ))}
        </g>
      ))}
      {lesson >= 4 &&
        lesson <= 7 &&
        nodes.map(
          ({ i, x }: { i: number; x: number }) =>
            row[i] > 0.0001 && (
              <line
                key={i}
                x1={x}
                y1={198 - layer * 65}
                x2={nodes[position].x}
                y2={149 - layer * 65}
                stroke={amber}
                opacity={0.55}
                strokeWidth={0.3 + row[i] * 6}
              />
            ),
        )}
    </svg>
  );
}
