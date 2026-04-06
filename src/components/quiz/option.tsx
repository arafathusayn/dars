import { getOptionLabel } from "@/data/constants";

interface OptionProps {
  opt: string;
  index: number;
  locked: boolean;
  selected: string | null;
  isAnswer: boolean;
  accent: string;
  onSelect: (opt: string) => void;
}

export function Option({
  opt,
  index,
  locked,
  selected,
  isAnswer,
  accent,
  onSelect,
}: OptionProps) {
  const isSelected = opt === selected;
  let bg = "var(--fill)";
  let bdr = "transparent";
  let tx = "var(--t1)";
  let bbg = "var(--fill2)";
  let btx = "var(--t2)";
  let anim = "";

  if (locked) {
    if (isAnswer) {
      bg = "var(--ok-s)";
      bdr = "var(--ok)";
      tx = "var(--ok-t)";
      bbg = "var(--ok)";
      btx = "#FFF";
      anim = "ap";
    } else if (isSelected) {
      bg = "var(--err-s)";
      bdr = "var(--err)";
      tx = "var(--err-t)";
      bbg = "var(--err)";
      btx = "#FFF";
      anim = "an";
    }
  } else if (isSelected) {
    bg = `${accent}1A`;
    bdr = `${accent}55`;
    tx = accent;
    bbg = accent;
    btx = "#FFF";
  }

  return (
    <button
      disabled={locked}
      onClick={() => onSelect(opt)}
      className={`ob ${anim} w-full rounded-2xl flex items-center gap-2.5 sm:gap-3`}
      style={{
        background: bg,
        border: `1.5px solid ${bdr}`,
        color: tx,
        minHeight: 50,
        padding: "12px 14px",
      }}
    >
      <span
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ background: bbg, color: btx, transition: "all .18s" }}
      >
        {locked && isAnswer
          ? "✓"
          : locked && isSelected && !isAnswer
            ? "✗"
            : getOptionLabel(index)}
      </span>
      <span
        className="flex-1 text-base font-medium"
        style={{ direction: "rtl", textAlign: "right", lineHeight: 1.45 }}
      >
        {opt}
      </span>
    </button>
  );
}
