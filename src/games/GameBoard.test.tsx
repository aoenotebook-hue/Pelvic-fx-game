import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameBoard } from "./GameBoard";
import { kinds, type MiniGameSpec } from "./spec";
import { pelvicTraumaContentV4 as content } from "../content/content.v4";
afterEach(cleanup);
const fixture = (kind: MiniGameSpec["kind"]): MiniGameSpec => ({
  kind,
  instruction: { en: "Build", th: "จัด" },
  art: "pelvis",
  alt: { en: "Schematic", th: "แผนภาพ" },
  cards: [
    { id: "a", label: { en: "A", th: "ก" }, icon: "pelvis", target: "bin" },
    { id: "b", label: { en: "B", th: "ข" }, icon: "pelvis", target: "bin" },
  ],
  bins: [{ id: "bin", label: { en: "Group", th: "กลุ่ม" } }],
  targets: ["a"],
  order: ["a", "b"],
  range: [0, 100],
  band: [40, 60],
  mistake: "test",
});
describe("accessible boards", () => {
  for (const kind of kinds)
    for (const language of ["en", "th"] as const)
      it(`${kind} renders in ${language} with accessible vector art`, () => {
        render(
          <GameBoard
            spec={fixture(kind)}
            language={language}
            onChange={() => undefined}
          />,
        );
        expect(screen.getByRole("region")).toHaveAccessibleName(
          language === "en" ? "Build" : "จัด",
        );
        for (const svg of document.querySelectorAll("svg"))
          expect(svg.querySelector("title")?.textContent).toBeTruthy();
      });
  it("sort works with click/keyboard buttons without dragging", () => {
    const change = vi.fn();
    render(
      <GameBoard spec={fixture("card_sort")} language="en" onChange={change} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^A/ }));
    fireEvent.click(screen.getByRole("button", { name: /Group/ }));
    expect(change).toHaveBeenLastCalledWith({ a: "bin" });
  });
  it("ring injury controls are disabled until checkpoints reviewed", () => {
    const spec = { ...fixture("ring_trace"), bins: undefined };
    render(<GameBoard spec={spec} language="en" onChange={() => undefined} />);
    expect(screen.getByRole("button", { name: /^A$/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "1 A" }));
    fireEvent.click(screen.getByRole("button", { name: "2 B" }));
    expect(screen.getByRole("button", { name: /^A$/ })).toBeEnabled();
  });
  it("gauge can be changed by the range control", () => {
    const change = vi.fn();
    render(
      <GameBoard spec={fixture("gauge")} language="en" onChange={change} />,
    );
    fireEvent.change(screen.getByRole("slider"), { target: { value: "50" } });
    expect(change).toHaveBeenCalledWith(50);
  });
  it("saved card placements resume", () => {
    render(
      <GameBoard
        spec={fixture("card_sort")}
        initialAnswer={{ a: "bin" }}
        language="en"
        onChange={() => undefined}
      />,
    );
    expect(screen.getByText("→ Group")).toBeVisible();
  });
  it("anatomy asks a location rather than showing six answer labels", () => {
    render(
      <GameBoard
        spec={content.nodes[0].game!}
        language="en"
        onChange={() => undefined}
      />,
    );
    expect(screen.getByText("Locate next:")).toBeVisible();
    expect(screen.getByRole("button", { name: /Region 1/ })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Ilium" })).toBeNull();
  });
});
