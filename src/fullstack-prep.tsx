import { useEffect, useMemo, useRef, useState } from "react";
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import sql from "highlight.js/lib/languages/sql";
import rust from "highlight.js/lib/languages/rust";
import data from "./data/fullstack-prep.json";

// Language set chosen by data analysis: 70 TS/JS, 21 SQL, 17 HTML, 1 Rust.
// TS handler also parses JS, so js/ts/tsx/jsx all map here.
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("javascript", typescript);
hljs.registerLanguage("tsx", typescript);
hljs.registerLanguage("jsx", typescript);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("rust", rust);

function highlightCodeIn(root: HTMLElement | null) {
  if (!root) return;
  const blocks = root.querySelectorAll("pre code");
  blocks.forEach((block) => {
    const el = block as HTMLElement;
    if (el.dataset.highlighted === "yes") return;
    try {
      hljs.highlightElement(el);
    } catch {
      /* ignore unknown language */
    }
  });
}

type FundamentalKey = keyof typeof data.fundamentals;
type QuestionCategoryKey = keyof typeof data.questions;
type QuizCategoryKey = keyof typeof data.quizzes;
type TabKey = "home" | "fundamentals" | "questions" | "quiz" | "tips";

interface QuizAnswer {
  picked: number;
  scored: boolean;
}

interface QuizState {
  answers: Record<string, QuizAnswer>;
  scores: Record<string, number>;
}

const STORAGE_KEY = "fullstack-prep-quiz-v1";

const COLOR_MAP: Record<string, { bg: string; fg: string }> = {
  purple: { bg: "var(--fp-purple-bg)", fg: "var(--fp-purple-fg)" },
  info: { bg: "var(--fp-info-bg)", fg: "var(--fp-info-fg)" },
  success: { bg: "var(--fp-success-bg)", fg: "var(--fp-success-fg)" },
  amber: { bg: "var(--fp-warning-bg)", fg: "var(--fp-warning-fg)" },
  warning: { bg: "var(--fp-warning-bg)", fg: "var(--fp-warning-fg)" },
  teal: { bg: "var(--fp-success-bg)", fg: "var(--fp-success-fg)" },
  red: { bg: "var(--fp-danger-bg)", fg: "var(--fp-danger-fg)" },
  danger: { bg: "var(--fp-danger-bg)", fg: "var(--fp-danger-fg)" },
  coral: { bg: "var(--fp-accent-bg)", fg: "var(--fp-accent-fg)" },
  pink: { bg: "var(--fp-accent-bg)", fg: "var(--fp-accent-fg)" },
};

function loadState(): QuizState {
  if (typeof window === "undefined") return { answers: {}, scores: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { answers: {}, scores: {} };
    const parsed = JSON.parse(raw) as Partial<QuizState>;
    return {
      answers: parsed.answers ?? {},
      scores: parsed.scores ?? {},
    };
  } catch {
    return { answers: {}, scores: {} };
  }
}

function saveState(state: QuizState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

function parseHash(): { tab?: TabKey; sub?: string } {
  if (typeof window === "undefined") return {};
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return {};
  const [tab, sub] = raw.split("/");
  return { tab: tab as TabKey, sub };
}

function buildHash(
  tab: TabKey,
  fundKey: string,
  qCat: string,
  quizCat: string,
): string {
  if (tab === "home") return "";
  if (tab === "tips") return "#tips";
  if (tab === "fundamentals") return `#fundamentals/${fundKey}`;
  if (tab === "questions") return `#questions/${qCat}`;
  if (tab === "quiz") return `#quiz/${quizCat}`;
  return "";
}

export default function FullstackPrep() {
  const [tab, setTab] = useState<TabKey>("home");
  const [fundKey, setFundKey] = useState<FundamentalKey>(
    Object.keys(data.fundamentals)[0] as FundamentalKey,
  );
  const [qCat, setQCat] = useState<QuestionCategoryKey>(
    Object.keys(data.questions)[0] as QuestionCategoryKey,
  );
  const [search, setSearch] = useState("");
  const [openQ, setOpenQ] = useState<Record<number, boolean>>({});
  const [quizCat, setQuizCat] = useState<QuizCategoryKey>(
    Object.keys(data.quizzes)[0] as QuizCategoryKey,
  );
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizState, setQuizState] = useState<QuizState>({
    answers: {},
    scores: {},
  });
  const [fundMenuOpen, setFundMenuOpen] = useState(false);
  const [qMenuOpen, setQMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fundArticleRef = useRef<HTMLElement>(null);
  const qListRef = useRef<HTMLDivElement>(null);

  const scrollToRef = (ref: React.RefObject<HTMLElement | null>) => {
    if (typeof window === "undefined") return;
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      // Offset for sticky header+tabs (~108px)
      const y = el.getBoundingClientRect().top + window.scrollY - 108;
      window.scrollTo({ top: y, behavior: "smooth" });
    });
  };

  useEffect(() => {
    setQuizState(loadState());
  }, []);

  useEffect(() => {
    highlightCodeIn(rootRef.current);
  }, [tab, fundKey, qCat, openQ, quizCat, quizIdx]);

  useEffect(() => {
    saveState(quizState);
  }, [quizState]);

  useEffect(() => {
    const apply = () => {
      const { tab: t, sub } = parseHash();
      if (!t) return;
      if (t === "home" || t === "tips") {
        setTab(t);
      } else if (t === "fundamentals") {
        setTab("fundamentals");
        if (sub && sub in data.fundamentals) setFundKey(sub as FundamentalKey);
      } else if (t === "questions") {
        setTab("questions");
        if (sub && sub in data.questions) setQCat(sub as QuestionCategoryKey);
      } else if (t === "quiz") {
        setTab("quiz");
        if (sub && sub in data.quizzes) {
          setQuizCat(sub as QuizCategoryKey);
          setQuizIdx(0);
        }
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const h = buildHash(tab, fundKey, qCat, quizCat);
    const currentHash = window.location.hash;
    if (currentHash !== h) {
      const url = h
        ? window.location.pathname + window.location.search + h
        : window.location.pathname + window.location.search;
      window.history.replaceState(null, "", url);
    }
  }, [tab, fundKey, qCat, quizCat]);

  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }, [tab, fundKey, qCat, quizCat, quizIdx]);

  const totalQuizzes = useMemo(
    () =>
      Object.values(data.quizzes).reduce(
        (sum, cat) => sum + cat.questions.length,
        0,
      ),
    [],
  );
  const totalScored = useMemo(
    () => Object.values(quizState.scores).reduce((a, b) => a + b, 0),
    [quizState.scores],
  );

  return (
    <div className="fp-root" ref={rootRef}>
      <style>{STYLES}</style>

      <div className="fp-sticky-top">
        <header className="fp-header">
          <div className="fp-header-inner">
            <div className="fp-logo">
              <div className="fp-logo-mark">{data.meta.logoMark}</div>
              <span>{data.meta.subtitle}</span>
            </div>
            {tab === "quiz" && (
              <div className="fp-progress-wrap">
                <span>
                  Overall: {totalScored} / {totalQuizzes}
                </span>
                <div className="fp-progress-bar">
                  <div
                    className="fp-progress-fill"
                    style={{
                      width: `${totalQuizzes ? (totalScored / totalQuizzes) * 100 : 0}%`,
                    }}
                  />
                </div>
                <button
                  className="fp-reset-btn"
                  title="Reset all progress"
                  aria-label="Reset all quiz progress"
                  onClick={() => {
                    if (confirm("সব quiz progress reset করবেন?")) {
                      setQuizState({ answers: {}, scores: {} });
                      setQuizIdx(0);
                    }
                  }}
                >
                  ↻
                </button>
              </div>
            )}
          </div>
        </header>

        <nav className="fp-main-tabs">
          {(
            [
              ["home", "হোম"],
              ["fundamentals", "Fundamentals"],
              ["questions", "Interview Questions"],
              ["quiz", "Quiz 🎯"],
              ["tips", "Tips"],
            ] as [TabKey, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              className={`fp-main-tab${tab === key ? " active" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <main className="fp-container">
        {tab === "home" && (
          <Home totalQuizzes={totalQuizzes} onGo={(t) => setTab(t)} />
        )}

        {tab === "fundamentals" && (
          <div className="fp-topic-layout">
            <aside className={`fp-topic-sidebar${fundMenuOpen ? " open" : ""}`}>
              <button
                className="fp-sidebar-toggle"
                aria-expanded={fundMenuOpen}
                onClick={() => setFundMenuOpen(!fundMenuOpen)}
              >
                <span className="fp-sidebar-toggle-label">
                  <span className="fp-sidebar-toggle-hint">Topic</span>
                  <span>{data.fundamentals[fundKey].title}</span>
                </span>
                <span className="fp-sidebar-toggle-arrow">▼</span>
              </button>
              <div className="fp-sidebar-list">
                <p className="fp-sidebar-title">Topics</p>
                {Object.entries(data.fundamentals).map(([key, value]) => (
                  <button
                    key={key}
                    className={`fp-sidebar-btn${fundKey === key ? " active" : ""}`}
                    onClick={() => {
                      setFundKey(key as FundamentalKey);
                      setFundMenuOpen(false);
                      scrollToRef(fundArticleRef);
                    }}
                  >
                    {value.title}
                  </button>
                ))}
              </div>
            </aside>
            <article className="fp-article" ref={fundArticleRef}>
              <h2>{data.fundamentals[fundKey].title}</h2>
              <div className="fp-lede">{data.fundamentals[fundKey].lede}</div>
              <div
                dangerouslySetInnerHTML={{
                  __html: data.fundamentals[fundKey].content,
                }}
              />
            </article>
          </div>
        )}

        {tab === "questions" && (
          <div className="fp-topic-layout">
            <aside className={`fp-topic-sidebar${qMenuOpen ? " open" : ""}`}>
              <button
                className="fp-sidebar-toggle"
                aria-expanded={qMenuOpen}
                onClick={() => setQMenuOpen(!qMenuOpen)}
              >
                <span className="fp-sidebar-toggle-label">
                  <span className="fp-sidebar-toggle-hint">Category</span>
                  <span>
                    {data.questions[qCat].title} (
                    {data.questions[qCat].items.length})
                  </span>
                </span>
                <span className="fp-sidebar-toggle-arrow">▼</span>
              </button>
              <div className="fp-sidebar-list">
                <p className="fp-sidebar-title">Categories</p>
                {Object.entries(data.questions).map(([key, value]) => (
                  <button
                    key={key}
                    className={`fp-sidebar-btn${qCat === key ? " active" : ""}`}
                    onClick={() => {
                      setQCat(key as QuestionCategoryKey);
                      setOpenQ({});
                      setQMenuOpen(false);
                      scrollToRef(qListRef);
                    }}
                  >
                    {value.title} ({value.items.length})
                  </button>
                ))}
              </div>
            </aside>
            <div ref={qListRef}>
              <input
                className="fp-search-box"
                type="text"
                placeholder="🔍 প্রশ্ন search করুন..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <QuestionList
                category={qCat}
                search={search}
                openQ={openQ}
                setOpenQ={setOpenQ}
              />
            </div>
          </div>
        )}

        {tab === "quiz" && (
          <QuizPane
            cat={quizCat}
            setCat={(c) => {
              setQuizCat(c);
              setQuizIdx(0);
            }}
            idx={quizIdx}
            setIdx={setQuizIdx}
            state={quizState}
            setState={setQuizState}
          />
        )}

        {tab === "tips" && (
          <article
            className="fp-article"
            dangerouslySetInnerHTML={{ __html: data.tips }}
          />
        )}
      </main>
    </div>
  );
}

function Home({
  totalQuizzes,
  onGo,
}: {
  totalQuizzes: number;
  onGo: (t: TabKey) => void;
}) {
  const fundCount = Object.keys(data.fundamentals).length;
  const qaCategoryCount = Object.keys(data.questions).length;
  const qaItemCount = Object.values(data.questions).reduce(
    (s, c) => s + c.items.length,
    0,
  );
  const quizCategoryCount = Object.keys(data.quizzes).length;
  const fundTitles = Object.values(data.fundamentals)
    .slice(0, 6)
    .map((f) => f.title.split(" ")[0])
    .join(", ");
  const qaTitles = Object.values(data.questions)
    .slice(0, 6)
    .map((q) => q.title.split(" ")[0])
    .join(", ");

  return (
    <>
      <div className="fp-hero">
        <h1>{data.meta.title}</h1>
        <p>{data.meta.description}</p>
        <div className="fp-hero-stats">
          <div className="fp-stat">
            <div className="fp-stat-num">{fundCount}</div>
            <div className="fp-stat-label">Fundamentals</div>
          </div>
          <div className="fp-stat">
            <div className="fp-stat-num">{qaItemCount}</div>
            <div className="fp-stat-label">Q&A items</div>
          </div>
          <div className="fp-stat">
            <div className="fp-stat-num">{totalQuizzes}</div>
            <div className="fp-stat-label">Quizzes</div>
          </div>
          <div className="fp-stat">
            <div className="fp-stat-num">{quizCategoryCount}</div>
            <div className="fp-stat-label">Quiz categories</div>
          </div>
        </div>
      </div>
      <div className="fp-feature-grid">
        <FeatureCard
          num="01"
          color="purple"
          title={`${fundCount} Fundamentals`}
          desc={`${fundTitles} + আরো - প্রতিটা topic-এ depth + breadth`}
          onClick={() => onGo("fundamentals")}
        />
        <FeatureCard
          num="02"
          color="info"
          title={`${qaItemCount} Q&A Items`}
          desc={`${qaCategoryCount} categories: ${qaTitles}...  - interview-ready answer`}
          onClick={() => onGo("questions")}
        />
        <FeatureCard
          num="03"
          color="warning"
          title={`${totalQuizzes} Quizzes`}
          desc={`${quizCategoryCount} category জুড়ে interactive quiz, explanation + score track`}
          onClick={() => onGo("quiz")}
        />
        <FeatureCard
          num="04"
          color="success"
          title="Interview Tips"
          desc="STAR method, behavioral answer, portfolio project, closing questions"
          onClick={() => onGo("tips")}
        />
      </div>
      <div className="fp-hero-footer">
        <p>
          💡 প্রথমে <strong>Fundamentals</strong> পড়ুন, তারপর{" "}
          <strong>Interview Questions</strong> দেখুন, শেষে <strong>Quiz</strong>
          -এ নিজেকে test করুন।
        </p>
      </div>
    </>
  );
}

function FeatureCard({
  num,
  color,
  title,
  desc,
  onClick,
}: {
  num: string;
  color: string;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.purple;
  return (
    <button className="fp-feature-card" onClick={onClick}>
      <div
        className="fp-feature-icon"
        style={{ background: c.bg, color: c.fg }}
      >
        {num}
      </div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </button>
  );
}

function QuestionList({
  category,
  search,
  openQ,
  setOpenQ,
}: {
  category: QuestionCategoryKey;
  search: string;
  openQ: Record<number, boolean>;
  setOpenQ: (v: Record<number, boolean>) => void;
}) {
  const cat = data.questions[category];
  const q = search.trim().toLowerCase();
  const items = useMemo(() => {
    if (!q) return cat.items.map((item, i) => ({ item, originalIdx: i }));
    return cat.items
      .map((item, i) => ({ item, originalIdx: i }))
      .filter(
        ({ item }) =>
          item[0].toLowerCase().includes(q) ||
          item[1].toLowerCase().includes(q),
      );
  }, [cat, q]);

  return (
    <>
      <h2 style={{ marginTop: 0 }}>{cat.title}</h2>
      {items.length === 0 ? (
        <div className="fp-callout warn">
          কোনো প্রশ্ন পাওয়া যায়নি "{search}" এর জন্য।
        </div>
      ) : (
        items.map(({ item, originalIdx }, displayIdx) => {
          const [title, body] = item;
          const open = openQ[originalIdx] ?? false;
          return (
            <div
              key={originalIdx}
              className={`fp-qa-item${open ? " open" : ""}`}
            >
              <div
                className="fp-qa-head"
                onClick={() => setOpenQ({ ...openQ, [originalIdx]: !open })}
              >
                <div className="fp-qa-num">
                  {String(displayIdx + 1).padStart(2, "0")}
                </div>
                <div
                  className="fp-qa-q"
                  dangerouslySetInnerHTML={{ __html: title }}
                />
                <div className="fp-qa-arrow">▼</div>
              </div>
              {open && (
                <div
                  className="fp-qa-body"
                  dangerouslySetInnerHTML={{ __html: body }}
                />
              )}
            </div>
          );
        })
      )}
    </>
  );
}

function QuizPane({
  cat,
  setCat,
  idx,
  setIdx,
  state,
  setState,
}: {
  cat: QuizCategoryKey;
  setCat: (c: QuizCategoryKey) => void;
  idx: number;
  setIdx: (i: number) => void;
  state: QuizState;
  setState: (s: QuizState) => void;
}) {
  const catData = data.quizzes[cat];
  const total = catData.questions.length;

  return (
    <>
      <div className="fp-quiz-categories">
        {Object.entries(data.quizzes).map(([key, value]) => {
          const score = state.scores[key] ?? 0;
          return (
            <button
              key={key}
              className={`fp-quiz-cat-btn${cat === key ? " active" : ""}`}
              onClick={() => setCat(key as QuizCategoryKey)}
            >
              {value.title}
              <span className="fp-quiz-cat-score">
                {score}/{value.questions.length}
              </span>
            </button>
          );
        })}
      </div>

      {idx >= total ? (
        <QuizResult
          cat={cat}
          onRetry={() => {
            const nextAnswers = { ...state.answers };
            for (const key of Object.keys(nextAnswers)) {
              if (key.startsWith(`${cat}-`)) delete nextAnswers[key];
            }
            setState({
              ...state,
              answers: nextAnswers,
              scores: { ...state.scores, [cat]: 0 },
            });
            setIdx(0);
          }}
          onNextCat={() => {
            const cats = Object.keys(data.quizzes) as QuizCategoryKey[];
            const next = cats[(cats.indexOf(cat) + 1) % cats.length];
            setCat(next);
          }}
          score={state.scores[cat] ?? 0}
          total={total}
        />
      ) : (
        <QuizCard
          cat={cat}
          idx={idx}
          state={state}
          onPick={(picked) => {
            const key = `${cat}-${idx}`;
            const already = state.answers[key];
            if (already) return;
            const question = catData.questions[idx];
            const correct = picked === question.correct;
            const answers = {
              ...state.answers,
              [key]: { picked, scored: correct },
            };
            const scores = correct
              ? {
                  ...state.scores,
                  [cat]: (state.scores[cat] ?? 0) + 1,
                }
              : state.scores;
            setState({ ...state, answers, scores });
          }}
          onNext={() => setIdx(idx + 1)}
          onPrev={() => setIdx(Math.max(0, idx - 1))}
        />
      )}
    </>
  );
}

function QuizCard({
  cat,
  idx,
  state,
  onPick,
  onNext,
  onPrev,
}: {
  cat: QuizCategoryKey;
  idx: number;
  state: QuizState;
  onPick: (i: number) => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const catData = data.quizzes[cat];
  const total = catData.questions.length;
  const qObj = catData.questions[idx];
  const key = `${cat}-${idx}`;
  const answered = state.answers[key];
  const col = COLOR_MAP[catData.color] ?? COLOR_MAP.purple;

  return (
    <div className="fp-quiz-card">
      <div className="fp-quiz-meta">
        <div className="fp-quiz-meta-left">
          <div
            className="fp-quiz-pill"
            style={{ background: col.bg, color: col.fg }}
          >
            {catData.title}
          </div>
          <span>
            প্রশ্ন {idx + 1} / {total}
          </span>
        </div>
        <div className="fp-progress-bar" style={{ width: 80 }}>
          <div
            className="fp-progress-fill"
            style={{ width: `${(idx / total) * 100}%` }}
          />
        </div>
      </div>

      <p
        className="fp-quiz-question"
        dangerouslySetInnerHTML={{ __html: qObj.q }}
      />

      <div className="fp-quiz-options">
        {qObj.options.map((opt, i) => {
          const letter = String.fromCharCode(65 + i);
          let cls = "fp-quiz-option";
          if (answered) {
            if (i === qObj.correct) cls += " correct";
            else if (i === answered.picked) cls += " wrong";
          }
          return (
            <button
              key={i}
              className={cls}
              disabled={!!answered}
              onClick={() => onPick(i)}
            >
              <div className="fp-quiz-option-marker">{letter}</div>
              <span dangerouslySetInnerHTML={{ __html: opt }} />
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="fp-quiz-explain show">
          <strong>
            {answered.picked === qObj.correct ? "✓ সঠিক!" : "✗ ভুল।"}
          </strong>{" "}
          <span dangerouslySetInnerHTML={{ __html: qObj.explain }} />
        </div>
      )}

      <div className="fp-quiz-actions">
        <button className="fp-btn" disabled={idx === 0} onClick={onPrev}>
          ← আগের
        </button>
        <button
          className="fp-btn fp-btn-primary"
          disabled={!answered}
          onClick={onNext}
        >
          {idx === total - 1 ? "Result দেখুন" : "পরের →"}
        </button>
      </div>
    </div>
  );
}

function QuizResult({
  cat,
  score,
  total,
  onRetry,
  onNextCat,
}: {
  cat: QuizCategoryKey;
  score: number;
  total: number;
  onRetry: () => void;
  onNextCat: () => void;
}) {
  const catData = data.quizzes[cat];
  const pct = Math.round((score / total) * 100);
  const { grade, msg, cls } =
    pct >= 80
      ? {
          grade: "চমৎকার! 🎉",
          msg: "এই topic-এ আপনি strong। Interview-এ confident-এ যেতে পারেন।",
          cls: "good",
        }
      : pct >= 50
        ? {
            grade: "ভালো, আরো practice।",
            msg: "Fundamentals আবার review করুন, তারপর quiz retry করুন।",
            cls: "mid",
          }
        : {
            grade: "আরো শিখতে হবে।",
            msg: "Fundamentals পড়ুন, Interview Questions দেখুন, তারপর আবার try।",
            cls: "low",
          };

  return (
    <div className="fp-quiz-result">
      <p className="fp-quiz-result-sub">{catData.title} Quiz Complete</p>
      <div className={`fp-quiz-result-score ${cls}`}>
        {score}/{total}
      </div>
      <h3>{grade}</h3>
      <p>{msg}</p>
      <div className="fp-quiz-result-actions">
        <button className="fp-btn" onClick={onRetry}>
          আবার দিন
        </button>
        <button className="fp-btn fp-btn-primary" onClick={onNextCat}>
          পরের Category →
        </button>
      </div>
    </div>
  );
}

const STYLES = `
.fp-root {
  --fp-bg: #fafaf7;
  --fp-surface: #ffffff;
  --fp-surface-2: #f4f3ee;
  --fp-border: rgba(20, 20, 20, 0.08);
  --fp-border-strong: rgba(20, 20, 20, 0.18);
  --fp-text: #1a1a1a;
  --fp-text-muted: #5f5e5a;
  --fp-text-dim: #888780;
  --fp-accent: #d85a30;
  --fp-accent-fg: #712b13;
  --fp-accent-bg: #faece7;
  --fp-info: #378add;
  --fp-info-bg: #e6f1fb;
  --fp-info-fg: #0c447c;
  --fp-success: #1d9e75;
  --fp-success-bg: #e1f5ee;
  --fp-success-fg: #085041;
  --fp-warning: #ba7517;
  --fp-warning-bg: #faeeda;
  --fp-warning-fg: #633806;
  --fp-danger: #e24b4a;
  --fp-danger-bg: #fcebeb;
  --fp-danger-fg: #791f1f;
  --fp-purple: #7f77dd;
  --fp-purple-bg: #eeedfe;
  --fp-purple-fg: #3c3489;
  --fp-radius-sm: 6px;
  --fp-radius: 10px;
  --fp-radius-lg: 14px;
  --fp-sans: 'Inter', 'Noto Sans Bengali', 'SolaimanLipi', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  --fp-mono: 'JetBrains Mono', 'Menlo', Consolas, monospace;
  font-feature-settings: "kern" 1, "liga" 1, "calt" 1;

  font-family: var(--fp-sans);
  background: var(--fp-bg);
  color: var(--fp-text);
  font-size: 16px;
  line-height: 1.75;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
  overflow-x: hidden;
}
@media (prefers-color-scheme: dark) {
  .fp-root {
    --fp-bg: #1a1a1a;
    --fp-surface: #242422;
    --fp-surface-2: #2c2c2a;
    --fp-border: rgba(255, 255, 255, 0.08);
    --fp-border-strong: rgba(255, 255, 255, 0.18);
    --fp-text: #f4f3ee;
    --fp-text-muted: #b4b2a9;
    --fp-text-dim: #888780;
    --fp-accent-bg: #4a1b0c;
    --fp-accent-fg: #f5c4b3;
    --fp-info-bg: #042c53;
    --fp-info-fg: #b5d4f4;
    --fp-success-bg: #04342c;
    --fp-success-fg: #9fe1cb;
    --fp-warning-bg: #412402;
    --fp-warning-fg: #fac775;
    --fp-danger-bg: #501313;
    --fp-danger-fg: #f7c1c1;
    --fp-purple-bg: #26215c;
    --fp-purple-fg: #cecbf6;
  }
}
.fp-root *, .fp-root *::before, .fp-root *::after { box-sizing: border-box; }

.fp-sticky-top {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--fp-bg);
  backdrop-filter: blur(12px);
}
.fp-header {
  border-bottom: 1px solid var(--fp-border);
  padding: 1rem 1.5rem;
  background: rgba(255,255,255,0.85);
}
@media (prefers-color-scheme: dark) {
  .fp-header { background: rgba(36,36,34,0.85); }
  .fp-sticky-top { background: rgba(26,26,26,0.6); }
}
.fp-header-inner {
  max-width: 1320px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.fp-logo {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.fp-logo-mark {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--fp-accent);
  color: white;
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  font-weight: 700;
  font-family: var(--fp-mono);
}
.fp-progress-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--fp-text-muted);
}
.fp-progress-bar {
  width: 120px;
  height: 6px;
  background: var(--fp-surface-2);
  border-radius: 99px;
  overflow: hidden;
}
.fp-progress-fill {
  height: 100%;
  background: var(--fp-success);
  transition: width 0.3s;
}
.fp-reset-btn {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid var(--fp-border);
  background: var(--fp-surface);
  color: var(--fp-text-muted);
  font-size: 0.95rem;
  font-family: inherit;
  cursor: pointer;
  display: grid;
  place-items: center;
  padding: 0;
  line-height: 1;
  transition: all 0.15s;
}
.fp-reset-btn:hover {
  color: var(--fp-danger);
  border-color: var(--fp-danger);
  background: var(--fp-danger-bg);
}

.fp-main-tabs {
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  gap: 0.25rem;
  border-bottom: 1px solid var(--fp-border);
  background: var(--fp-bg);
  overflow-x: auto;
  scrollbar-width: thin;
}
.fp-main-tab {
  padding: 0.85rem 1.1rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--fp-text-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.fp-main-tab:hover { color: var(--fp-text); }
.fp-main-tab.active {
  color: var(--fp-text);
  border-bottom-color: var(--fp-accent);
}

.fp-container {
  max-width: 1320px;
  margin: 0 auto;
  padding: 2rem 1.5rem 5rem;
  animation: fpFade 0.3s;
}
@media (max-width: 640px) {
  .fp-container { padding: 1.25rem 0.9rem 4rem; }
  .fp-header { padding: 0.6rem 0.9rem; }
  .fp-main-tabs { padding: 0 0.9rem; gap: 0; }
  .fp-logo { font-size: 0.9rem; gap: 0.5rem; }
  .fp-logo-mark { width: 26px; height: 26px; font-size: 0.68rem; }
  .fp-main-tab { padding: 0.6rem 0.8rem; font-size: 0.85rem; }
  .fp-progress-wrap { font-size: 0.75rem; }
  .fp-progress-bar { width: 80px !important; }
  .fp-reset-btn { width: 22px; height: 22px; font-size: 0.85rem; }
  .fp-feature-card { padding: 1rem; }
  .fp-feature-card h3 { font-size: 0.95rem; }
  .fp-feature-card p { font-size: 0.82rem; line-height: 1.5; }
  .fp-feature-icon { width: 30px; height: 30px; font-size: 0.72rem; margin-bottom: 0.5rem; }
  .fp-sidebar-btn { font-size: 0.85rem; padding: 0.5rem 0.7rem; }
  .fp-search-box { font-size: 0.88rem; padding: 0.6rem 0.85rem; }
  .fp-qa-head { padding: 0.7rem 0.9rem; gap: 0.5rem; }
  .fp-qa-q { font-size: 0.9rem; }
  .fp-qa-num { width: 24px; height: 24px; font-size: 0.7rem; }
  .fp-qa-body { padding: 0 0.9rem 0.85rem 2.75rem; font-size: 0.88rem; }
  .fp-qa-body pre { font-size: 0.76rem; padding: 0.6rem 0.8rem; }
  .fp-quiz-card { padding: 1.1rem 1.1rem; }
  .fp-quiz-question { font-size: 0.98rem; margin-bottom: 1rem; }
  .fp-quiz-option { font-size: 0.88rem; padding: 0.7rem 0.85rem; }
  .fp-quiz-option-marker { width: 22px; height: 22px; font-size: 0.7rem; }
  .fp-quiz-explain { font-size: 0.85rem; padding: 0.75rem 0.9rem; }
  .fp-btn { font-size: 0.85rem; padding: 0.55rem 1rem; }
  .fp-quiz-cat-btn {
    font-size: 0.78rem;
    padding: 0.4rem 0.7rem;
    flex: 0 0 auto !important;
    white-space: nowrap !important;
  }
  .fp-quiz-cat-score { font-size: 0.68rem; }
  .fp-quiz-categories {
    padding: 0.4rem;
    gap: 0.4rem;
    flex-wrap: nowrap !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }
  .fp-quiz-result { padding: 2rem 1rem; }
  .fp-quiz-result-score { font-size: 2.6rem; }
  .fp-quiz-result h3 { font-size: 1.1rem; }
}
@keyframes fpFade {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: none; }
}

.fp-hero {
  text-align: center;
  padding: 3rem 1rem 2rem;
}
.fp-hero h1 {
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  font-weight: 700;
  margin: 0 0 0.75rem;
  letter-spacing: -0.02em;
  line-height: 1.25;
}
.fp-hero p {
  color: var(--fp-text-muted);
  font-size: 1.1rem;
  max-width: 640px;
  margin: 0 auto;
}
.fp-hero-stats {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1rem 2.5rem;
  margin-top: 2rem;
}
.fp-stat {
  text-align: center;
  min-width: 100px;
}
.fp-stat-num {
  font-family: var(--fp-mono);
  font-size: 2.4rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--fp-text);
  line-height: 1;
}
.fp-stat-label {
  font-size: 0.8rem;
  color: var(--fp-text-muted);
  margin-top: 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
@media (max-width: 640px) {
  .fp-hero {
    padding: 1.75rem 0.5rem 1.25rem;
  }
  .fp-hero p {
    font-size: 0.95rem;
    line-height: 1.55;
  }
  .fp-hero-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    margin-top: 1.5rem;
    max-width: 340px;
    margin-left: auto;
    margin-right: auto;
  }
  .fp-stat { min-width: 0; }
  .fp-stat-num { font-size: 1.9rem; }
  .fp-stat-label { font-size: 0.7rem; letter-spacing: 0.05em; }
  .fp-feature-grid { gap: 0.75rem; margin-top: 1.25rem; }
  .fp-hero-footer { margin-top: 2rem; font-size: 0.85rem; }
}
.fp-hero-footer {
  margin-top: 3rem;
  text-align: center;
  color: var(--fp-text-muted);
  font-size: 0.9rem;
}
.fp-feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-top: 2rem;
}
.fp-feature-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius-lg);
  padding: 1.25rem;
  transition: all 0.15s;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.fp-feature-card:hover {
  border-color: var(--fp-border-strong);
  transform: translateY(-2px);
}
.fp-feature-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  margin-bottom: 0.75rem;
  font-family: var(--fp-mono);
  font-weight: 600;
  font-size: 0.85rem;
}
.fp-feature-card h3 {
  margin: 0 0 0.35rem;
  font-size: 1rem;
  font-weight: 600;
}
.fp-feature-card p {
  margin: 0;
  color: var(--fp-text-muted);
  font-size: 0.9rem;
  line-height: 1.55;
}

.fp-topic-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 2rem;
  align-items: start;
}
@media (max-width: 820px) {
  .fp-topic-layout { grid-template-columns: 1fr; gap: 1rem; }
  .fp-topic-sidebar { position: static !important; max-height: none !important; padding-right: 0 !important; }
  .fp-sidebar-toggle { display: flex !important; }
  .fp-topic-sidebar .fp-sidebar-list {
    display: none;
    margin-top: 0.5rem;
    max-height: 60vh;
    overflow-y: auto;
    padding: 0.5rem;
    background: var(--fp-surface);
    border: 1px solid var(--fp-border);
    border-radius: var(--fp-radius);
  }
  .fp-topic-sidebar.open .fp-sidebar-list { display: block; animation: fpFade 0.2s; }
}
.fp-topic-sidebar {
  position: sticky;
  top: 124px;
  max-height: calc(100vh - 140px);
  overflow-y: auto;
  padding-right: 0.5rem;
}
.fp-sidebar-toggle {
  display: none;
  width: 100%;
  padding: 0.7rem 0.9rem;
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  font-family: inherit;
  font-size: 0.9rem;
  color: var(--fp-text);
  cursor: pointer;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  transition: border-color 0.15s;
}
.fp-sidebar-toggle:hover { border-color: var(--fp-border-strong); }
.fp-sidebar-toggle-label {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  text-align: left;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fp-sidebar-toggle-hint {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fp-text-dim);
  font-weight: 600;
}
.fp-sidebar-toggle-arrow {
  color: var(--fp-text-muted);
  font-size: 0.7rem;
  transition: transform 0.2s;
}
.fp-topic-sidebar.open .fp-sidebar-toggle-arrow { transform: rotate(180deg); }
.fp-sidebar-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fp-text-dim);
  margin: 0 0 0.75rem;
  padding: 0 0.5rem;
}
.fp-sidebar-btn {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.55rem 0.75rem;
  margin-bottom: 2px;
  background: none;
  border: none;
  border-radius: var(--fp-radius-sm);
  font-family: inherit;
  font-size: 0.9rem;
  color: var(--fp-text-muted);
  cursor: pointer;
  transition: all 0.1s;
}
.fp-sidebar-btn:hover {
  background: var(--fp-surface-2);
  color: var(--fp-text);
}
.fp-sidebar-btn.active {
  background: var(--fp-accent-bg);
  color: var(--fp-accent-fg);
  font-weight: 500;
}

.fp-article {
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius-lg);
  padding: 2rem 2.25rem;
}
@media (max-width: 640px) {
  .fp-article { padding: 1.25rem 1rem; }
  .fp-article pre { font-size: 0.78rem; padding: 0.75rem 0.9rem; }
  .fp-article table { font-size: 0.85rem; }
  .fp-article h2 { font-size: 1.4rem; }
  .fp-article h3 { font-size: 1.1rem; margin-top: 1.5rem; }
}
.fp-article h2 {
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  letter-spacing: -0.015em;
}
.fp-article h3 {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 2rem 0 0.5rem;
}
.fp-article h4 {
  font-size: 1.02rem;
  font-weight: 600;
  margin: 1.5rem 0 0.4rem;
}
.fp-article p { margin: 0.75rem 0; }
.fp-article ul, .fp-article ol { padding-left: 1.4rem; margin: 0.5rem 0; }
.fp-article li { margin: 0.3rem 0; }
.fp-article strong { font-weight: 600; }
.fp-article code {
  font-family: var(--fp-mono);
  font-size: 0.88em;
  background: var(--fp-surface-2);
  padding: 0.1em 0.4em;
  border-radius: 4px;
  border: 1px solid var(--fp-border);
}
.fp-article pre {
  background: var(--fp-surface-2);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  padding: 1rem 1.25rem;
  overflow-x: auto;
  font-size: 0.85rem;
  line-height: 1.55;
  margin: 1rem 0;
}
.fp-article pre code {
  background: none;
  border: none;
  padding: 0;
}

/* highlight.js theme - GitHub-ish, theme-aware */
.fp-root .hljs { color: var(--fp-hl-fg); background: transparent; }
.fp-root {
  --fp-hl-fg: #24292e;
  --fp-hl-keyword: #d73a49;
  --fp-hl-string: #032f62;
  --fp-hl-number: #005cc5;
  --fp-hl-comment: #6a737d;
  --fp-hl-function: #6f42c1;
  --fp-hl-title: #6f42c1;
  --fp-hl-type: #e36209;
  --fp-hl-variable: #e36209;
  --fp-hl-attr: #005cc5;
  --fp-hl-tag: #22863a;
  --fp-hl-built-in: #005cc5;
  --fp-hl-literal: #005cc5;
}
@media (prefers-color-scheme: dark) {
  .fp-root {
    --fp-hl-fg: #e1e4e8;
    --fp-hl-keyword: #ff7b72;
    --fp-hl-string: #a5d6ff;
    --fp-hl-number: #79c0ff;
    --fp-hl-comment: #8b949e;
    --fp-hl-function: #d2a8ff;
    --fp-hl-title: #d2a8ff;
    --fp-hl-type: #ffa657;
    --fp-hl-variable: #ffa657;
    --fp-hl-attr: #79c0ff;
    --fp-hl-tag: #7ee787;
    --fp-hl-built-in: #79c0ff;
    --fp-hl-literal: #79c0ff;
  }
}
.fp-root .hljs-keyword,
.fp-root .hljs-selector-tag,
.fp-root .hljs-meta-keyword,
.fp-root .hljs-doctag { color: var(--fp-hl-keyword); }
.fp-root .hljs-string,
.fp-root .hljs-regexp,
.fp-root .hljs-addition,
.fp-root .hljs-attribute,
.fp-root .hljs-meta-string { color: var(--fp-hl-string); }
.fp-root .hljs-number,
.fp-root .hljs-literal,
.fp-root .hljs-symbol,
.fp-root .hljs-bullet { color: var(--fp-hl-number); }
.fp-root .hljs-comment,
.fp-root .hljs-quote,
.fp-root .hljs-deletion,
.fp-root .hljs-meta { color: var(--fp-hl-comment); font-style: italic; }
.fp-root .hljs-function .hljs-title,
.fp-root .hljs-title.function_ { color: var(--fp-hl-function); }
.fp-root .hljs-title,
.fp-root .hljs-section,
.fp-root .hljs-selector-id,
.fp-root .hljs-class .hljs-title,
.fp-root .hljs-title.class_ { color: var(--fp-hl-title); font-weight: 600; }
.fp-root .hljs-type,
.fp-root .hljs-params { color: var(--fp-hl-type); }
.fp-root .hljs-variable,
.fp-root .hljs-template-variable { color: var(--fp-hl-variable); }
.fp-root .hljs-attr,
.fp-root .hljs-selector-attr,
.fp-root .hljs-selector-pseudo { color: var(--fp-hl-attr); }
.fp-root .hljs-tag,
.fp-root .hljs-name { color: var(--fp-hl-tag); }
.fp-root .hljs-built_in,
.fp-root .hljs-builtin-name,
.fp-root .hljs-property { color: var(--fp-hl-built-in); }
.fp-root .hljs-emphasis { font-style: italic; }
.fp-root .hljs-strong { font-weight: 700; }
.fp-article .fp-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin: 1rem 0;
}
.fp-article table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  font-size: 0.92rem;
  table-layout: auto;
}
.fp-article th, .fp-article td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--fp-border);
  border-right: 1px solid var(--fp-border);
  text-align: left;
  vertical-align: top;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.fp-article th:last-child, .fp-article td:last-child { border-right: none; }
.fp-article th {
  font-weight: 600;
  background: var(--fp-surface-2);
  font-size: 0.85rem;
}
.fp-article tr:last-child td { border-bottom: none; }
@media (max-width: 700px) {
  .fp-article table { font-size: 0.8rem; }
  .fp-article th, .fp-article td { padding: 0.45rem 0.5rem; }
}
/* Horizontal scroll ONLY on tables (not on page).
   The outer .fp-root has overflow-x:hidden to cap any accidental bleed,
   while each table gets display:block + overflow-x:auto so its interior
   scrolls horizontally when cells exceed viewport width. */
@media (max-width: 820px) {
  .fp-container { max-width: 100%; overflow-x: hidden; }
  .fp-article { max-width: 100%; overflow-x: hidden; }
  .fp-article table {
    display: block;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    max-width: 100%;
    width: 100%;
  }
  .fp-article th,
  .fp-article td {
    word-break: normal;
    overflow-wrap: normal;
    white-space: normal;
    padding: 0.4rem 0.55rem;
    /* No min-width: cells hug their content. Short values stay narrow,
       long values expand - horizontal scroll only when sum exceeds viewport. */
  }
  .fp-article pre {
    font-size: 0.72rem;
    padding: 0.6rem 0.75rem;
    line-height: 1.5;
  }
  .fp-article h2 { font-size: 1.3rem; }
  .fp-article h3 { font-size: 1rem; margin-top: 1.3rem; }
  .fp-article h4 { font-size: 0.95rem; margin-top: 1rem; }
  .fp-article p, .fp-article li { font-size: 0.92rem; line-height: 1.65; }
  .fp-article ul, .fp-article ol { padding-left: 1.2rem; }
  .fp-article .compare-grid {
    grid-template-columns: 1fr;
    gap: 0.6rem;
  }
  .fp-article .compare-card { padding: 0.8rem; }
  .fp-article .compare-card h5 { font-size: 0.88rem; }
  .fp-article .compare-card p { font-size: 0.8rem; }
  .fp-article .callout, .fp-callout {
    font-size: 0.88rem;
    padding: 0.7rem 0.9rem;
  }
  .fp-lede { font-size: 0.95rem; padding-left: 0.8rem; }
}
.fp-lede {
  font-size: 1.05rem;
  color: var(--fp-text-muted);
  border-left: 3px solid var(--fp-accent);
  padding-left: 1rem;
  margin: 1rem 0 1.5rem;
}
.fp-article .callout, .fp-callout {
  background: var(--fp-info-bg);
  border-radius: var(--fp-radius);
  padding: 0.85rem 1.1rem;
  margin: 1rem 0;
  font-size: 0.95rem;
  color: var(--fp-info-fg);
}
.fp-article .callout.warn, .fp-callout.warn { background: var(--fp-warning-bg); color: var(--fp-warning-fg); }
.fp-article .callout.good, .fp-callout.good { background: var(--fp-success-bg); color: var(--fp-success-fg); }

.fp-article .compare-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.75rem;
  margin: 1rem 0;
}
.fp-article .compare-card {
  background: var(--fp-surface-2);
  border-radius: var(--fp-radius);
  padding: 1rem;
}
.fp-article .compare-card h5 {
  margin: 0 0 0.4rem;
  font-size: 0.92rem;
  font-weight: 600;
}
.fp-article .compare-card p {
  margin: 0;
  font-size: 0.85rem;
  color: var(--fp-text-muted);
  line-height: 1.55;
}

.fp-qa-item {
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  margin-bottom: 0.6rem;
  overflow: hidden;
  background: var(--fp-surface);
}
.fp-qa-head {
  padding: 0.85rem 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  user-select: none;
  transition: background 0.12s;
}
.fp-qa-head:hover { background: var(--fp-surface-2); }
.fp-qa-num {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  background: var(--fp-surface-2);
  border-radius: 6px;
  display: grid;
  place-items: center;
  font-size: 0.78rem;
  font-weight: 600;
  font-family: var(--fp-mono);
  color: var(--fp-text-muted);
}
.fp-qa-q { flex: 1; font-weight: 500; font-size: 0.98rem; }
.fp-qa-arrow {
  transition: transform 0.2s;
  color: var(--fp-text-dim);
  font-size: 0.75rem;
}
.fp-qa-item.open .fp-qa-arrow { transform: rotate(180deg); }
.fp-qa-body {
  padding: 0 1.1rem 1rem 3.85rem;
  color: var(--fp-text-muted);
  font-size: 0.95rem;
  animation: fpFade 0.2s;
}
.fp-qa-body p { margin: 0.5rem 0; }
.fp-qa-body ul { margin: 0.4rem 0; padding-left: 1.2rem; }
.fp-qa-body code {
  font-family: var(--fp-mono);
  font-size: 0.88em;
  background: var(--fp-surface-2);
  padding: 0.1em 0.4em;
  border-radius: 4px;
  border: 1px solid var(--fp-border);
}
.fp-qa-body pre {
  background: var(--fp-surface-2);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  padding: 0.75rem 1rem;
  overflow-x: auto;
  font-size: 0.82rem;
  line-height: 1.5;
}
.fp-qa-body pre code { background: none; border: none; padding: 0; }

.fp-search-box {
  width: 100%;
  padding: 0.7rem 1rem;
  border: 1px solid var(--fp-border);
  background: var(--fp-surface);
  border-radius: var(--fp-radius);
  font-family: inherit;
  font-size: 0.95rem;
  color: var(--fp-text);
  margin-bottom: 1rem;
}
.fp-search-box:focus {
  outline: none;
  border-color: var(--fp-accent);
}

.fp-quiz-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  padding: 0.5rem;
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
}
.fp-quiz-cat-btn {
  padding: 0.5rem 0.9rem;
  background: none;
  border: 1px solid var(--fp-border);
  border-radius: 999px;
  font-family: inherit;
  font-size: 0.85rem;
  color: var(--fp-text-muted);
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.fp-quiz-cat-btn:hover { border-color: var(--fp-border-strong); color: var(--fp-text); }
.fp-quiz-cat-btn.active {
  background: var(--fp-text);
  color: var(--fp-bg);
  border-color: var(--fp-text);
}
.fp-quiz-cat-score {
  font-size: 0.72rem;
  padding: 1px 6px;
  background: rgba(255,255,255,0.15);
  border-radius: 4px;
}
.fp-quiz-cat-btn:not(.active) .fp-quiz-cat-score {
  background: var(--fp-surface-2);
  color: var(--fp-text-muted);
}

.fp-quiz-card {
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius-lg);
  padding: 1.5rem 1.75rem;
  margin-bottom: 1rem;
}
.fp-quiz-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: var(--fp-text-muted);
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.fp-quiz-meta-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.fp-quiz-pill {
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 600;
}
.fp-quiz-question {
  font-size: 1.08rem;
  font-weight: 500;
  margin: 0 0 1.25rem;
  line-height: 1.55;
}
.fp-quiz-question code {
  font-family: var(--fp-mono);
  font-size: 0.88em;
  background: var(--fp-surface-2);
  padding: 0.1em 0.4em;
  border-radius: 4px;
  border: 1px solid var(--fp-border);
}
.fp-quiz-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.fp-quiz-option {
  padding: 0.85rem 1rem;
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius);
  background: var(--fp-bg);
  font-family: inherit;
  font-size: 0.95rem;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.12s;
  color: var(--fp-text);
}
.fp-quiz-option code {
  font-family: var(--fp-mono);
  font-size: 0.88em;
  background: var(--fp-surface-2);
  padding: 0.1em 0.4em;
  border-radius: 4px;
}
.fp-quiz-option:hover:not(:disabled) {
  border-color: var(--fp-border-strong);
  background: var(--fp-surface-2);
}
.fp-quiz-option:disabled { cursor: default; opacity: 0.92; }
.fp-quiz-option-marker {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1.5px solid var(--fp-border-strong);
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: var(--fp-mono);
  color: var(--fp-text-muted);
}
.fp-quiz-option.correct {
  background: var(--fp-success-bg);
  border-color: var(--fp-success);
  color: var(--fp-success-fg);
}
.fp-quiz-option.correct .fp-quiz-option-marker {
  background: var(--fp-success);
  border-color: var(--fp-success);
  color: white;
}
.fp-quiz-option.wrong {
  background: var(--fp-danger-bg);
  border-color: var(--fp-danger);
  color: var(--fp-danger-fg);
}
.fp-quiz-option.wrong .fp-quiz-option-marker {
  background: var(--fp-danger);
  border-color: var(--fp-danger);
  color: white;
}
.fp-quiz-explain {
  margin-top: 1rem;
  padding: 0.9rem 1.1rem;
  background: var(--fp-info-bg);
  color: var(--fp-info-fg);
  border-radius: var(--fp-radius);
  font-size: 0.92rem;
  animation: fpFade 0.25s;
}
.fp-quiz-explain code {
  font-family: var(--fp-mono);
  font-size: 0.88em;
  background: rgba(0,0,0,0.08);
  padding: 0.1em 0.4em;
  border-radius: 4px;
}
.fp-quiz-explain strong { font-weight: 600; }

.fp-quiz-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.25rem;
  gap: 0.5rem;
}
.fp-btn {
  padding: 0.6rem 1.2rem;
  border: 1px solid var(--fp-border-strong);
  background: var(--fp-surface);
  color: var(--fp-text);
  border-radius: var(--fp-radius);
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.12s;
}
.fp-btn:hover:not(:disabled) {
  background: var(--fp-surface-2);
  border-color: var(--fp-text-muted);
}
.fp-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.fp-btn-primary {
  background: var(--fp-text);
  color: var(--fp-bg);
  border-color: var(--fp-text);
}
.fp-btn-primary:hover:not(:disabled) { opacity: 0.9; }

.fp-quiz-result {
  text-align: center;
  padding: 3rem 1.5rem;
  background: var(--fp-surface);
  border: 1px solid var(--fp-border);
  border-radius: var(--fp-radius-lg);
}
.fp-quiz-result-sub {
  color: var(--fp-text-muted);
  margin: 0;
  font-size: 0.9rem;
}
.fp-quiz-result-score {
  font-size: 3.5rem;
  font-weight: 700;
  font-family: var(--fp-mono);
  letter-spacing: -0.03em;
  margin: 0.5rem 0;
}
.fp-quiz-result-score.good { color: var(--fp-success); }
.fp-quiz-result-score.mid { color: var(--fp-warning); }
.fp-quiz-result-score.low { color: var(--fp-danger); }
.fp-quiz-result h3 { margin: 0 0 0.5rem; font-size: 1.3rem; }
.fp-quiz-result p { color: var(--fp-text-muted); max-width: 380px; margin: 0.5rem auto; }
.fp-quiz-result-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}
`;
