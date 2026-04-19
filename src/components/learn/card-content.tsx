import type { Vocab } from "@/schemas/quiz";
import {
  getMeaning,
  getPronunciation,
  getRefBefore,
  getRefAfter,
  getRefSrc,
} from "@/data/vocabulary";
import * as m from "#/paraglide/messages";

interface CardContentProps {
  v: Vocab;
  accent: string;
}

const GENDER_ICON = { M: "♂", F: "♀" } as const;

export function CardContent({ v, accent }: CardContentProps) {
  const gc = v.g === "M" ? accent : "#FF9500";
  const bc = v.g === "M" ? "#3478F6" : "#E8447A";
  const r = v.ref;
  const meaning = getMeaning(v);
  const pr = getPronunciation(v);

  return (
    <div
      className="rounded-2xl h-full"
      style={{
        border: "1px solid var(--sep)",
        background: "var(--surface)",
        overflow: "hidden",
      }}
    >
      <div className="flex items-stretch h-full">
        <div className="w-1 shrink-0" style={{ background: gc }} />
        <div className="flex-1 p-4 flex flex-col min-h-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="text-2xl font-bold"
                style={{ direction: "rtl", lineHeight: 1.4 }}
              >
                {v.ar}
              </p>
              <p
                className="text-xs font-medium mt-0.5"
                style={{ color: "var(--t3)" }}
              >
                {pr}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p
                className="text-base font-semibold"
                style={{ color: "var(--t1)" }}
              >
                {meaning}
              </p>
              <span
                className="mt-1.5 rounded-md inline-flex items-center gap-0.5"
                style={{
                  background: `${bc}14`,
                  color: bc,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: ".02em",
                  padding: "3px 6px",
                  lineHeight: 1,
                }}
              >
                {GENDER_ICON[v.g]} {v.g === "M" ? m.masculine() : m.feminine()}
              </span>
            </div>
          </div>

          <div
            className="mt-3 pt-3"
            style={{ borderTop: ".5px solid var(--sep)" }}
          >
            <p
              className="text-sm"
              style={{ direction: "rtl", color: "var(--t2)" }}
            >
              {v.g === "M" ? "هٰذَا" : "هٰذِهِ"} {v.ar}
              <span style={{ color: "var(--t3)", direction: "ltr" }}>
                {" "}
                — {m.this_is_a({ word: meaning.toLowerCase() })}
              </span>
            </p>
          </div>

          {r && (
            <div
              className="mt-3 rounded-xl px-3.5 py-3 flex-1 flex flex-col min-h-0 overflow-hidden"
              style={{ background: "var(--fill)" }}
            >
              <div className="flex-1 overflow-y-auto min-h-0">
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--t2)" }}
                >
                  {getRefBefore(v)}{" "}
                  <span className="font-bold" style={{ color: accent }}>
                    {r.word}
                  </span>{" "}
                  <span
                    className="font-semibold"
                    style={{ color: accent, opacity: 0.7 }}
                  >
                    ({r.roman})
                  </span>{" "}
                  {getRefAfter(v)}
                </p>
              </div>
              <p
                className="text-xs font-semibold mt-2 pt-2 flex items-center gap-1.5 shrink-0"
                style={{
                  color: "var(--t3)",
                  borderTop: "0.5px solid var(--sep)",
                }}
              >
                <span style={{ fontSize: 11 }}>📖</span> {getRefSrc(v)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
