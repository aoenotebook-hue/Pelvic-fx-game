import { useEffect, useState } from "react";
import { ClinicalArt } from "../art/ClinicalArt";
import type { MiniGameSpec } from "./spec";
import type { Language } from "../i18n";
const unitThai: Record<string, string> = {
  "illustration only": "ภาพประกอบเท่านั้น",
  "mL": "มล.",
  "min": "นาที",
  "minutes": "นาที",
  "%": "%",
};
export function GameBoard({
  spec,
  language,
  onChange,
  seed = 0,
  initialAnswer,
}: {
  spec: MiniGameSpec;
  language: Language;
  onChange(answer: unknown): void;
  seed?: number;
  initialAnswer?: unknown;
}) {
  const restored = initialAnswer as
    { pairs?: string[][]; visited?: string[]; breaks?: string[] } | undefined;
  const [answer, setAnswer] = useState<unknown>(
      initialAnswer ?? (spec.kind === "gauge" ? (spec.range?.[0] ?? 0) : null),
    ),
    [active, setActive] = useState<string | null>(null),
    [flipped, setFlipped] = useState<string[]>([]),
    [trials, setTrials] = useState<string[][]>(restored?.pairs ?? []),
    [found, setFound] = useState<string[]>(
      restored?.pairs
        ?.filter(
          (pair) =>
            pair.length === 2 &&
            spec.cards.find((c) => c.id === pair[0])?.target ===
              spec.cards.find((c) => c.id === pair[1])?.target,
        )
        .flat() ?? [],
    ),
    [trace, setTrace] = useState<string[]>(restored?.visited ?? []);
  // A slider starts at a real value, so the learner may submit it unchanged.
  useEffect(() => {
    if (spec.kind === "gauge" && initialAnswer == null) onChange(spec.range?.[0] ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const t = (en: string, th: string) => (language === "th" ? th : en);
  const cards = [...spec.cards].sort((a, b) => {
    const hash = (id: string) =>
      [...id].reduce((n, x) => (n * 31 + x.charCodeAt(0) + seed) % 997, 0);
    return hash(a.id) - hash(b.id);
  });
  const update = (value: unknown) => {
    setAnswer(value);
    onChange(value);
  };
  const array = Array.isArray(answer)
    ? (answer as string[])
    : spec.kind === "ring_trace"
      ? ((answer as { breaks?: string[] } | null)?.breaks ?? [])
      : [];
  const selected = (id: string) => array.includes(id) || answer === id;
  const flip = (id: string) => {
    if (flipped.length === 2) {
      setFlipped([id]);
      return;
    }
    if (flipped.includes(id) || found.includes(id)) return;
    const next = [...flipped, id];
    setFlipped(next);
    if (next.length === 2) {
      const history = [...trials, next];
      setTrials(history);
      update({ pairs: history, moves: history.length });
      const [a, b] = next.map((x) => spec.cards.find((c) => c.id === x)!);
      if (a.target === b.target) {
        setFound((previous) => [...previous, ...next]);
        setFlipped([]);
      }
    }
  };
  const place = (bin: string) => {
    if (!active) return;
    update({ ...((answer ?? {}) as Record<string, string>), [active]: bin });
    setActive(null);
  };
  const pick = (id: string) => {
    if (spec.kind === "image_pick" || spec.kind === "mcq") {
      update(id);
      return;
    }
    const next = selected(id) ? array.filter((x) => x !== id) : [...array, id];
    update(
      spec.kind === "ring_trace" ? { visited: trace, breaks: next } : next,
    );
  };
  const tile = (card: MiniGameSpec["cards"][number], index: number) => {
    const map =
      answer && !Array.isArray(answer) && typeof answer === "object"
        ? (answer as Record<string, string>)
        : {};
    const memory = spec.kind === "memory_match",
      face = !memory || flipped.includes(card.id) || found.includes(card.id);
    return (
      <button
        key={card.id}
        type="button"
        className={`game-tile ${active === card.id && !selected(card.id) ? "picked" : selected(card.id) || found.includes(card.id) ? "chosen" : ""}`}
        aria-pressed={
          selected(card.id) || active === card.id || found.includes(card.id)
        }
        aria-label={
          memory && !face
            ? t(`Memory card ${index + 1}`, `การ์ดความจำ ${index + 1}`)
            : active === card.id
              ? t(`Selected: ${card.label.en} — now choose a group`, `เลือกแล้ว: ${card.label.th} — เลือกกลุ่มต่อ`)
              : card.label[language]
        }
        disabled={
          (memory && found.includes(card.id)) ||
          (spec.kind === "ring_trace" && trace.length !== spec.cards.length)
        }
        draggable={["card_sort", "handover_builder"].includes(spec.kind)}
        onDragStart={(event) => {
          setActive(card.id);
          event.dataTransfer.setData("text/plain", card.id);
        }}
        onClick={() =>
          memory
            ? flip(card.id)
            : ["card_sort", "handover_builder"].includes(spec.kind)
              ? setActive(card.id)
              : spec.kind === "sequence"
                ? update(
                    array.includes(card.id)
                      ? array.filter((id) => id !== card.id)
                      : [...array, card.id],
                  )
                : pick(card.id)
        }
      >
        {face ? (
          <>
            <ClinicalArt
              kind={card.icon}
              size={92}
              ariaLabel={card.label[language]}
            />
            <span>{card.label[language]}</span>
            {map[card.id] && (
              <small>
                →{" "}
                {spec.bins?.find((b) => b.id === map[card.id])?.label[language]}
              </small>
            )}
          </>
        ) : (
          <>
            <span className="memory-back">✦</span>
            <span>{index + 1}</span>
          </>
        )}
      </button>
    );
  };
  return (
    <section className="game-board" aria-label={spec.instruction[language]}>
      <p className="game-instruction">{spec.instruction[language]}</p>
      {spec.kind === "hotspot" && spec.order && (
        <p className="hotspot-prompt">
          {t("Locate next: ", "ระบุต่อไป: ")}
          <strong>
            {spec.cards.find((card) => card.id === spec.order![array.length])
              ?.label[language] ??
              t(
                "All selected; check or tap to revise",
                "เลือกครบแล้ว ตรวจหรือแตะเพื่อแก้ไข",
              )}
          </strong>
        </p>
      )}
      {spec.image && (
        <figure>
          <a href={spec.image} target="_blank" rel="noreferrer">
            <img src={spec.image} alt={spec.alt[language]} />
          </a>
          <figcaption>
            {t(
              "Supplied annotated teaching example; enlarge. Use the stated case report for abnormalities.",
              "ภาพตัวอย่างจากเอกสาร แตะขยาย ยึดรายงานเคสสำหรับความผิดปกติ",
            )}
          </figcaption>
        </figure>
      )}
      {spec.kind === "gauge" ? (
        <>
          <ClinicalArt
            kind={spec.art}
            ariaLabel={spec.alt[language]}
            amount={
              typeof answer === "number" ? answer / (spec.range?.[1] || 100) : 0
            }
          />
          <label className="dial-label">
            {t("Your setting", "ค่าที่เลือก")}
            <output>
              {typeof answer === "number" ? answer : spec.range?.[0]}{" "}
              {spec.unit ? (language === "th" ? (unitThai[spec.unit] ?? spec.unit) : spec.unit) : ""}
            </output>
            <input
              type="range"
              min={spec.range?.[0] ?? 0}
              max={spec.range?.[1] ?? 100}
              step={spec.range?.[1] === 2500 ? 50 : 1}
              value={typeof answer === "number" ? answer : spec.range?.[0]}
              onChange={(e) => update(Number(e.target.value))}
            />
          </label>
        </>
      ) : (
        <>
          {spec.kind === "hotspot" && (
            <>
              <div className="hotspot-art interactive-anatomy">
                <ClinicalArt
                  kind={spec.art}
                  size={330}
                  ariaLabel={spec.alt[language]}
                />
                {spec.cards.map((card, i) => (
                  <button
                    key={card.id}
                    className={
                      selected(card.id)
                        ? "anatomy-marker chosen"
                        : "anatomy-marker"
                    }
                    style={{
                      left: `${card.x ?? [25, 32, 35, 45, 50, 67][i] ?? 50}%`,
                      top: `${card.y ?? [35, 69, 87, 41, 77, 33][i] ?? 50}%`,
                    }}
                    aria-label={
                      spec.order
                        ? t(
                            `Region ${i + 1}${["left upper wing", "left lower ring", "anterior bridge", "central posterior bone", "midline anterior joint", "right posterior joint"][i] ? `: ${["left upper wing", "left lower ring", "anterior bridge", "central posterior bone", "midline anterior joint", "right posterior joint"][i]}` : ""}`,
                            `ตำแหน่ง ${i + 1}${["ปีกด้านซ้ายบน", "วงแหวนด้านซ้ายล่าง", "สะพานกระดูกด้านหน้า", "กระดูกส่วนกลางด้านหลัง", "ข้อต่อกลางด้านหน้า", "ข้อต่อด้านขวาหลัง"][i] ? `: ${["ปีกด้านซ้ายบน", "วงแหวนด้านซ้ายล่าง", "สะพานกระดูกด้านหน้า", "กระดูกส่วนกลางด้านหลัง", "ข้อต่อกลางด้านหน้า", "ข้อต่อด้านขวาหลัง"][i]}` : ""}`,
                          )
                        : card.label[language]
                    }
                    aria-pressed={selected(card.id)}
                    onClick={() => pick(card.id)}
                  >
                    {selected(card.id) ? "✓" : i + 1}
                  </button>
                ))}
              </div>
              <p>
                {t(
                  "Teaching schematic, not a diagnostic image. Tap regions or use the labelled controls.",
                  "แผนภาพเพื่อเรียน ไม่ใช่ภาพวินิจฉัย แตะตำแหน่งหรือใช้ปุ่มที่มีชื่อ",
                )}
              </p>
            </>
          )}
          {spec.kind === "ring_trace" && (
            <>
              <p>
                {t(
                  "First visit every checkpoint; then select the report-supported injury sites.",
                  "ตรวจทุก checkpoint ก่อน แล้วเลือกตำแหน่งที่รายงานพบ injury",
                )}
              </p>
              <div className="trace-track">
                {spec.cards.map((c, i) => (
                  <button
                    key={c.id}
                    className={trace.includes(c.id) ? "chosen" : ""}
                    onClick={() => {
                      const next = trace.includes(c.id)
                        ? trace
                        : [...trace, c.id];
                      setTrace(next);
                      update({ visited: next, breaks: array });
                    }}
                  >
                    {trace.includes(c.id) ? "✓" : i + 1} {c.label[language]}
                  </button>
                ))}
              </div>
            </>
          )}
          {spec.kind === "sequence" && (
            <ol
              className="sequence-track"
              aria-label={t("Current order", "ลำดับที่จัด")}
            >
              {array.map((id) => (
                <li key={id}>
                  <button onClick={() => update(array.filter((x) => x !== id))}>
                    {spec.cards.find((c) => c.id === id)?.label[language]} ×
                  </button>
                </li>
              ))}
            </ol>
          )}
          <div
            className="game-deck"
            hidden={spec.kind === "hotspot" && Boolean(spec.order)}
            style={
              spec.kind === "ring_trace" && trace.length !== spec.cards.length
                ? { pointerEvents: "none", opacity: 0.45 }
                : undefined
            }
          >
            {cards.map(tile)}
          </div>
          {spec.bins && (
            <div className="game-bins">
              {spec.bins.map((bin) => (
                <button
                  key={bin.id}
                  className="game-bin"
                  disabled={!active}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/plain");
                    if (spec.cards.some((c) => c.id === id)) {
                      update({
                        ...((answer ?? {}) as Record<string, string>),
                        [id]: bin.id,
                      });
                      setActive(null);
                    }
                  }}
                  onClick={() => place(bin.id)}
                >
                  <strong>{bin.label[language]}</strong>
                  <span>
                    {t(
                      "Select a card, then place here",
                      "เลือกการ์ด แล้วแตะวางที่นี่",
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
          <p aria-live="polite">
            {spec.count
              ? `${array.length} / ${spec.count} ${t("cards", "การ์ด")}`
              : spec.kind === "memory_match"
                ? `${found.length / 2} / ${spec.cards.length / 2} ${t("pairs", "คู่")}`
                : spec.kind === "sequence"
                  ? `${array.length} / ${spec.cards.length}`
                  : ""}
          </p>
        </>
      )}
    </section>
  );
}
