import { useState, useEffect, useRef } from "react";
import { useSearch, useRouter } from "@tanstack/react-router";
import { useQuiz } from "@/hooks/use-quiz";
import { QUIZ_CSS } from "@/styles/quiz-theme";
import { GearIcon } from "@/components/gear-icon";
import { Menu } from "@/components/menu";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LearnView } from "@/components/learn/learn-view";
import { QuizView } from "@/components/quiz/quiz-view";
import type { ViewMode } from "@/schemas/quiz";
import * as m from "#/paraglide/messages";

export default function App() {
  const q = useQuiz();
  const { s, d, T, mr, reset, nextTheme } = q;
  const { save, menu, theme } = s;
  const accent = q.accent;
  const shell = { maxWidth: 780, margin: "0 auto", width: "100%" };

  // Tab state from URL search params (?tab=learn|quiz)
  const { tab } = useSearch({ strict: false });
  const router = useRouter();
  const view: ViewMode = tab ?? "learn";

  const setView = (v: ViewMode) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", v);
    void router.navigate({
      to: url.pathname,
      search: { tab: v },
      replace: true,
    });
    if (menu) d({ type: T.MENU });
  };

  const [compact, setCompact] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setCompact(!e.isIntersecting),
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const LARGE_H = 100;

  const menuProps = {
    open: menu,
    save,
    theme,
    onToggleSave: () => d({ type: T.SAVE }),
    onNextTheme: nextTheme,
    onReset: () => {
      reset();
      d({ type: T.MENU });
    },
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: "var(--bg)",
        color: "var(--t1)",
        fontFamily:
          "-apple-system,BlinkMacSystemFont,'SF Pro Text','SF Pro Display',system-ui,sans-serif",
        WebkitFontSmoothing: "antialiased",
        transition: "background .35s,color .35s",
      }}
    >
      <style>{QUIZ_CSS}</style>

      <header
        style={{
          position: "sticky",
          top: -LARGE_H,
          zIndex: 20,
          background: "var(--surface)",
        }}
      >
        {/* Large title */}
        <div
          ref={titleRef}
          style={{ height: LARGE_H, ...shell }}
          className="px-5 flex items-end pb-3"
        >
          <div className="flex items-end justify-between w-full gap-4">
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-medium mb-1"
                style={{ color: "var(--t3)" }}
              >
                {m.lesson_1()}
              </p>
              <h1
                style={{
                  fontSize: "clamp(22px, 6.5vw, 28px)",
                  fontWeight: 700,
                  letterSpacing: "-.025em",
                  lineHeight: 1.1,
                }}
              >
                {m.body_parts()}
              </h1>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 400,
                  color: "var(--t3)",
                  lineHeight: 1,
                  marginTop: 4,
                }}
              >
                أَعْضَاءُ الْجَسَدِ
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 pb-0.5">
              {!compact && (
                <>
                  <LocaleSwitcher />
                  <div className="relative" ref={compact ? undefined : mr}>
                    <button
                      onClick={() => d({ type: T.MENU })}
                      className="flex items-center justify-center active:scale-90 transition-transform"
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        background: menu ? "var(--fill)" : "transparent",
                      }}
                      aria-label={m.settings()}
                    >
                      <GearIcon />
                    </button>
                    {!compact && <Menu {...menuProps} />}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Compact nav */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 21,
            background: "var(--surface)",
            borderBottom: ".5px solid var(--sep)",
          }}
        >
          <div style={shell} className="px-5">
            <div
              className="flex items-center justify-between"
              style={{ height: 44 }}
            >
              <span
                style={{
                  fontSize: "clamp(14px, 4.5vw, 17px)",
                  fontWeight: 600,
                  letterSpacing: "-.01em",
                  opacity: compact ? 1 : 0,
                  transform: compact ? "translateY(0)" : "translateY(6px)",
                  transition:
                    "opacity .2s,transform .25s cubic-bezier(.33,1,.68,1)",
                  display: "flex",
                  alignItems: "baseline",
                  gap: 6,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                {m.body_parts()}
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 400,
                    color: "var(--t3)",
                    opacity: compact ? 1 : 0,
                    transform: compact ? "translateX(0)" : "translateX(-6px)",
                    transition:
                      "opacity .25s ease .06s,transform .3s cubic-bezier(.33,1,.68,1) .04s",
                  }}
                >
                  ({m.lesson_1()})
                </span>
              </span>
              {compact && (
                <div className="flex items-center gap-1.5">
                  <LocaleSwitcher />
                  <div className="relative" ref={compact ? mr : undefined}>
                    <button
                      onClick={() => d({ type: T.MENU })}
                      className="flex items-center justify-center active:scale-90 transition-transform"
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        background: menu ? "var(--fill)" : "transparent",
                      }}
                      aria-label={m.settings()}
                    >
                      <GearIcon />
                    </button>
                    {compact && <Menu {...menuProps} />}
                  </div>
                </div>
              )}
            </div>

            {/* Segmented control */}
            <div
              className="flex rounded-lg p-0.5 mb-3"
              style={{ background: "var(--fill)" }}
            >
              {[
                { k: "learn" as const, l: m.learn() },
                { k: "quiz" as const, l: m.quiz() },
              ].map((t) => (
                <button
                  key={t.k}
                  onClick={() => setView(t.k)}
                  className="flex-1 text-sm font-semibold rounded-md py-1.5 transition-all"
                  style={{
                    background: view === t.k ? "var(--bg)" : "transparent",
                    color: view === t.k ? "var(--t1)" : "var(--t2)",
                    boxShadow:
                      view === t.k ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                  }}
                >
                  {t.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div style={shell} className="px-5 pt-4 pb-12">
        {view === "learn" ? <LearnView accent={accent} /> : <QuizView {...q} />}
      </div>
    </div>
  );
}
