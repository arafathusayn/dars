import {
  useReducer,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useState,
} from "react";
import type { QuizState, Category, ThemeMode } from "@/schemas/quiz";
import { ACCENT_LIGHT, ACCENT_DARK } from "@/data/constants";
import { shuffle, makeQuestions } from "@/data/quiz-questions";

// ── Action types ──
export const T = {
  SET_CAT: "SET_CAT",
  SEL: "SEL",
  CONFIRM: "CONFIRM",
  NAV: "NAV",
  RESULTS: "RESULTS",
  RETAKE: "RETAKE",
  SAVE: "SAVE",
  LOAD: "LOAD",
  RESET: "RESET",
  MENU: "MENU",
  THEME: "THEME",
} as const;

type Action =
  | { type: typeof T.SET_CAT; cat: Category }
  | { type: typeof T.SEL; opt: string }
  | { type: typeof T.CONFIRM }
  | { type: typeof T.NAV; d: number }
  | { type: typeof T.RESULTS }
  | { type: typeof T.RETAKE; scope: "all" | "cat"; ids: string[] }
  | { type: typeof T.SAVE }
  | { type: typeof T.LOAD; ans: Record<string, boolean> }
  | { type: typeof T.RESET }
  | { type: typeof T.MENU }
  | { type: typeof T.THEME; v: ThemeMode };

const init = (): QuizState => ({
  cat: "All",
  ans: {},
  sel: null,
  lk: false,
  i: 0,
  qs: shuffle(makeQuestions()),
  done: false,
  save: false,
  menu: false,
  theme: "system",
  k: 0,
});

function reducer(s: QuizState, a: Action): QuizState {
  switch (a.type) {
    case T.SET_CAT:
      return {
        ...s,
        cat: a.cat,
        i: 0,
        sel: null,
        lk: false,
        done: false,
        menu: false,
        k: s.k + 1,
      };
    case T.SEL:
      return s.lk ? s : { ...s, sel: a.opt };
    case T.CONFIRM: {
      if (!s.sel || s.lk) return s;
      const f = s.qs.filter((q) => s.cat === "All" || q.cat === s.cat);
      const c = f[s.i];
      return c
        ? { ...s, lk: true, ans: { ...s.ans, [c.id]: s.sel === c.a } }
        : s;
    }
    case T.NAV: {
      const f = s.qs.filter((q) => s.cat === "All" || q.cat === s.cat);
      const n = s.i + a.d;
      return n < 0 || n >= f.length
        ? s
        : { ...s, i: n, sel: null, lk: false, k: s.k + 1 };
    }
    case T.RESULTS:
      return { ...s, done: true };
    case T.RETAKE: {
      let ans: Record<string, boolean> = {};
      if (a.scope === "cat") {
        const ids = new Set(a.ids);
        ans = { ...s.ans };
        ids.forEach((id) => delete ans[id]);
      }
      return {
        ...s,
        ans,
        qs: shuffle(makeQuestions()),
        sel: null,
        lk: false,
        i: 0,
        done: false,
        k: s.k + 1,
      };
    }
    case T.SAVE:
      return { ...s, save: !s.save };
    case T.LOAD:
      return { ...s, ans: a.ans };
    case T.RESET:
      return { ...init(), save: s.save, theme: s.theme, k: s.k + 1 };
    case T.MENU:
      return { ...s, menu: !s.menu };
    case T.THEME:
      return { ...s, theme: a.v };
    default:
      return s;
  }
}

// ── Hook ──
export function useQuiz() {
  const [s, d] = useReducer(reducer, null, init);
  const mr = useRef<HTMLDivElement>(null);
  const { cat, ans, qs, i, done, save, menu, theme } = s;

  // Read what the head script already resolved — avoids flash
  const [sysDark, setSysDark] = useState(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.getAttribute("data-theme") === "dark";
  });

  // Listen for system color scheme changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme:dark)");
    // Sync initial value from matchMedia (not from stale default)
    setSysDark(mq.matches);
    const h = (e: MediaQueryListEvent) => setSysDark(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  const resolved = theme === "system" ? (sysDark ? "dark" : "light") : theme;

  const fl = useMemo(
    () => qs.filter((q) => cat === "All" || q.cat === cat),
    [qs, cat],
  );
  const cur = fl[i] ?? null;
  const tot = fl.length;
  const dn = fl.filter((q) => ans[q.id] !== undefined).length;
  const ok = fl.filter((q) => ans[q.id] === true).length;
  const er = fl.filter((q) => ans[q.id] === false).length;
  const pct = tot ? Math.round((dn / tot) * 100) : 0;
  const acc = dn ? Math.round((ok / dn) * 100) : 0;

  const am = resolved === "dark" ? ACCENT_DARK : ACCENT_LIGHT;
  const accent = cur ? (am[cur.cat] ?? am.All) : (am[cat] ?? am.All);
  const last = i >= tot - 1;
  const complete = tot > 0 && dn === tot;

  // Auto-show results when all questions answered
  useEffect(() => {
    if (complete && !done) {
      const t = setTimeout(() => d({ type: T.RESULTS }), 450);
      return () => clearTimeout(t);
    }
  }, [complete, done]);

  // Load saved answers — only on initial mount when save is already on, not when toggling
  const saveInitialized = useRef(false);
  useEffect(() => {
    if (!save) {
      saveInitialized.current = false;
      return;
    }
    if (saveInitialized.current) return; // don't reload when toggling save on mid-session
    saveInitialized.current = true;
    try {
      const raw = localStorage.getItem("aq-a");
      if (raw && !Object.keys(ans).length)
        d({ type: T.LOAD, ans: JSON.parse(raw) });
    } catch {}
  }, [save]);

  // Persist answers — write even when empty (to clear stale data after retake)
  useEffect(() => {
    if (!save) return;
    try {
      localStorage.setItem("aq-a", JSON.stringify(ans));
    } catch {}
  }, [ans, save]);

  // Sync React state with what head script already applied from localStorage
  const themeLoaded = useRef(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("aq-t");
      if (stored && ["light", "dark", "system"].includes(stored))
        d({ type: T.THEME, v: stored as ThemeMode });
    } catch {}
    themeLoaded.current = true;
  }, []);

  // Persist theme and sync DOM — but skip initial mount (head script already set it)
  useEffect(() => {
    if (!themeLoaded.current) return;
    try {
      localStorage.setItem("aq-t", theme);
    } catch {}
    const resolved_ = theme === "system" ? (sysDark ? "dark" : "light") : theme;
    document.documentElement.setAttribute("data-theme", resolved_);
    document.documentElement.style.colorScheme = resolved_;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", resolved_ === "dark" ? "#1c1c1e" : "#ffffff");
  }, [theme, sysDark]);

  // Close menu on outside click
  useEffect(() => {
    if (!menu) return;
    const h = (e: PointerEvent) => {
      if (mr.current && !mr.current.contains(e.target as Node))
        d({ type: T.MENU });
    };
    document.addEventListener("pointerdown", h);
    return () => document.removeEventListener("pointerdown", h);
  }, [menu]);

  const reset = useCallback(() => {
    d({ type: T.RESET });
    if (save) {
      try {
        localStorage.removeItem("aq-a");
      } catch {}
    }
  }, [save]);

  const cStats = useCallback(
    (c: Category) => {
      const cq = c === "All" ? qs : qs.filter((q) => q.cat === c);
      const dn = cq.filter((q) => ans[q.id] !== undefined).length;
      return { dn, tot: cq.length, full: dn === cq.length && cq.length > 0 };
    },
    [qs, ans],
  );

  const nextTheme = useCallback(() => {
    const n: ThemeMode =
      theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    d({ type: T.THEME, v: n });
  }, [theme]);

  return {
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
    resolved,
    mr,
    reset,
    cStats,
    nextTheme,
    am,
  };
}

export type UseQuizReturn = ReturnType<typeof useQuiz>;
