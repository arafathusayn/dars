import type { Question, Category } from "@/schemas/quiz";
import * as m from "#/paraglide/messages";

interface ResultsProps {
  acc: number;
  ok: number;
  er: number;
  tot: number;
  cat: Category;
  accent: string;
  fl: Question[];
  ans: Record<string, boolean>;
  onRetake: (scope: "all" | "cat", ids: string[]) => void;
  onSetCat: (cat: Category) => void;
  onNavTo: (index: number) => void;
}

export function Results({
  acc,
  ok,
  er,
  tot,
  cat,
  accent,
  fl,
  ans,
  onRetake,
  onSetCat,
  onNavTo,
}: ResultsProps) {
  const grade =
    acc >= 90
      ? { l: m.grade_excellent(), s: m.grade_excellent_sub(), c: "var(--ok)" }
      : acc >= 70
        ? { l: m.grade_well_done(), s: m.grade_well_done_sub(), c: accent }
        : acc >= 50
          ? {
              l: m.grade_getting_there(),
              s: m.grade_getting_there_sub(),
              c: "#FF9500",
            }
          : {
              l: m.grade_keep_practicing(),
              s: m.grade_keep_practicing_sub(),
              c: "var(--err)",
            };

  const R = 52;
  const C = 2 * Math.PI * R;
  const ids = fl.map((q) => q.id);

  return (
    <div
      className="asi rounded-3xl overflow-hidden"
      style={{ background: "var(--surface)", boxShadow: "var(--sh-card)" }}
    >
      <div className="pt-8 sm:pt-10 pb-6 sm:pb-8 flex flex-col items-center">
        <div
          className="relative mb-5"
          style={{ width: 120, height: 120, "--rc": C } as React.CSSProperties}
        >
          <svg viewBox="0 0 140 140" width="100%" height="100%">
            <circle
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke="var(--fill)"
              strokeWidth="8"
            />
            <circle
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke={grade.c}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - acc / 100)}
              transform="rotate(-90 70 70)"
              className="ard"
              style={{ opacity: 0.85 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="text-4xl font-bold tabular-nums"
              style={{ color: grade.c }}
            >
              {acc}
              <span className="text-lg font-semibold">%</span>
            </span>
          </div>
        </div>
        <h2 className="text-2xl font-bold" style={{ color: "var(--t1)" }}>
          {grade.l}
        </h2>
        <p
          className="text-sm mt-1 text-center px-8"
          style={{ color: "var(--t2)", lineHeight: 1.5 }}
        >
          {grade.s}
        </p>
      </div>

      <div className="px-4 sm:px-6 pb-7">
        <div className="flex gap-2 sm:gap-3 mb-7">
          {[
            { n: ok, l: m.correct(), c: "var(--ok)", s: "var(--ok-s)" },
            { n: er, l: m.wrong(), c: "var(--err)", s: "var(--err-s)" },
            { n: tot, l: m.total(), c: accent, s: `${accent}18` },
          ].map((x) => (
            <div
              key={x.l}
              className="flex-1 rounded-2xl py-3.5 text-center"
              style={{ background: x.s }}
            >
              <p
                className="text-2xl font-bold tabular-nums"
                style={{ color: x.c }}
              >
                {x.n}
              </p>
              <p
                className="text-xs font-medium mt-1"
                style={{ color: x.c, opacity: 0.65 }}
              >
                {x.l}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => onRetake(cat === "All" ? "all" : "cat", ids)}
            className="w-full rounded-2xl text-base font-semibold text-white active:scale-95 transition-transform"
            style={{ background: accent, minHeight: 50 }}
          >
            {m.retake_shuffle()}
          </button>
          {er > 0 && (
            <button
              onClick={() => {
                onSetCat(cat);
                const fi = fl.findIndex((q) => ans[q.id] === false);
                if (fi >= 0) setTimeout(() => onNavTo(fi), 0);
              }}
              className="w-full rounded-2xl text-base font-semibold active:scale-95 transition-transform"
              style={{
                background: "var(--err-s)",
                color: "var(--err)",
                minHeight: 50,
              }}
            >
              {m.review_mistakes({ count: String(er) })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
