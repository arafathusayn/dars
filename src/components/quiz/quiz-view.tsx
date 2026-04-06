import type { UseQuizReturn } from "@/hooks/use-quiz";
import { CATS, getCategoryLabel } from "@/data/constants";
import { Option } from "./option";
import { Nav } from "./nav";
import { Results } from "./results";
import * as m from "#/paraglide/messages";

interface QuizViewProps extends UseQuizReturn {}

export function QuizView(props: QuizViewProps) {
  const {
    s,
    d,
    T,
    fl,
    cur,
    tot,
    dn,
    ok,
    er,
    pct,
    acc,
    accent,
    last,
    cStats,
    am,
  } = props;
  const { cat, ans, sel, lk, i, done, k } = s;

  return (
    <div>
      {/* Score strip */}
      <div
        className="flex items-center gap-4 rounded-2xl px-4 mb-4"
        style={{
          background: "var(--surface)",
          height: 52,
          boxShadow: "var(--sh-chip)",
        }}
      >
        <svg width="32" height="32" viewBox="0 0 32 32">
          <circle
            cx="16"
            cy="16"
            r="12"
            fill="none"
            stroke="var(--fill3)"
            strokeWidth="3"
          />
          <circle
            cx="16"
            cy="16"
            r="12"
            fill="none"
            stroke={accent}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 12}
            strokeDashoffset={2 * Math.PI * 12 * (1 - pct / 100)}
            transform="rotate(-90 16 16)"
            style={{
              transition: "stroke-dashoffset .6s cubic-bezier(.33,1,.68,1)",
            }}
          />
        </svg>
        <div className="flex-1">
          <span
            className="text-sm font-semibold tabular-nums"
            style={{ color: "var(--t2)" }}
          >
            {m.score_progress({ done: String(dn), total: String(tot) })}
          </span>
        </div>
        <div
          className="flex items-center gap-3"
          style={{ opacity: dn > 0 ? 1 : 0, transition: "opacity .3s" }}
        >
          <span
            className="text-xs font-semibold tabular-nums"
            style={{ color: "var(--ok)" }}
          >
            {ok}✓
          </span>
          <span
            className="text-xs font-semibold tabular-nums"
            style={{ color: "var(--err)" }}
          >
            {er}✗
          </span>
        </div>
      </div>

      {/* Categories */}
      <div
        className="pb-4 flex gap-2 overflow-x-auto hide-sb"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {CATS.map((c) => {
          const a = cat === c;
          const ac = am[c];
          const st = cStats(c);
          return (
            <button
              key={c}
              onClick={() => d({ type: T.SET_CAT, cat: c })}
              className="flex items-center gap-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0"
              style={{
                padding: "9px 16px",
                minHeight: 38,
                background: a ? ac : "var(--surface)",
                color: a ? "#FFF" : ac,
                boxShadow: a ? "none" : "var(--sh-chip)",
                transition: "all .22s",
              }}
            >
              {getCategoryLabel(c)}
              {st.full ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle
                    cx="6"
                    cy="6"
                    r="6"
                    fill={a ? "rgba(255,255,255,.3)" : `${ac}28`}
                  />
                  <path
                    d="M3.5 6L5.5 8L8.5 4.5"
                    stroke={a ? "#fff" : ac}
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <span style={{ opacity: 0.5 }}>
                  {st.dn}/{st.tot}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {done ? (
        <Results
          acc={acc}
          ok={ok}
          er={er}
          tot={tot}
          cat={cat}
          accent={accent}
          fl={fl}
          ans={ans}
          onRetake={(scope, ids) => d({ type: T.RETAKE, scope, ids })}
          onSetCat={(c) => d({ type: T.SET_CAT, cat: c })}
          onNavTo={(idx) => d({ type: T.NAV, d: idx })}
        />
      ) : cur ? (
        <div
          key={k}
          className="au rounded-3xl overflow-hidden"
          style={{ background: "var(--surface)", boxShadow: "var(--sh-card)" }}
        >
          <div
            style={{
              height: 3,
              background: `linear-gradient(90deg,${accent},${accent}88)`,
            }}
          />
          <div
            className="px-4 sm:px-6 pt-5 pb-1 flex items-center justify-between"
            style={{ minHeight: 36 }}
          >
            <span
              className="text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-md"
              style={{
                background: `${accent}1A`,
                color: accent,
                letterSpacing: ".04em",
              }}
            >
              {getCategoryLabel(cur.cat)}
            </span>
            <span
              className="text-xs font-medium tabular-nums"
              style={{ color: "var(--t3)" }}
            >
              {i + 1} / {tot}
            </span>
          </div>
          <div className="px-4 sm:px-6 pt-3 pb-5" style={{ minHeight: 80 }}>
            <h2
              className="text-lg sm:text-xl font-semibold"
              style={{ lineHeight: 1.55, letterSpacing: "-.01em" }}
            >
              {cur.q}
            </h2>
          </div>
          <div className="px-3.5 sm:px-5 pb-3 flex flex-col gap-2.5">
            {cur.opts.map((opt, oi) => (
              <Option
                key={oi}
                opt={opt}
                index={oi}
                locked={lk}
                selected={sel}
                isAnswer={opt === cur.a}
                accent={accent}
                onSelect={(o) => d({ type: T.SEL, opt: o })}
              />
            ))}
          </div>
          <div className="px-3.5 sm:px-5 pt-1 pb-1" style={{ minHeight: 48 }}>
            {lk && (
              <div
                className="au px-4 py-3 rounded-xl flex items-center gap-2"
                style={{
                  background: sel === cur.a ? "var(--ok-s)" : "var(--err-s)",
                }}
              >
                <span
                  className="text-sm font-semibold"
                  style={{
                    color: sel === cur.a ? "var(--ok-t)" : "var(--err-t)",
                  }}
                >
                  {sel === cur.a
                    ? m.correct()
                    : m.answer_prefix({ answer: cur.a })}
                </span>
              </div>
            )}
          </div>
          <div className="px-3.5 sm:px-5 pb-6 pt-1">
            <Nav
              locked={lk}
              selected={sel}
              isLast={last}
              index={i}
              accent={accent}
              onBack={() => d({ type: T.NAV, d: -1 })}
              onConfirm={() => d({ type: T.CONFIRM })}
              onNext={() => d({ type: T.NAV, d: 1 })}
              onResults={() => d({ type: T.RESULTS })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
