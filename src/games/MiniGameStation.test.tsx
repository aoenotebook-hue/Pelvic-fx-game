import { useRef, useState } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MiniGameStation } from "./MiniGameStation";
import { pelvicTraumaContentV4 as content } from "../content/content.v4";
import { pelvicTraumaContentV5 } from "../content/content.v5";
import type { LearningEvent, Node } from "../domain/types";
const { settings } = vi.hoisted(() => ({
  settings: new Map<string, { key: string; value: unknown }>(),
}));
vi.mock("../storage/db", () => ({
  getDb: async () => ({
    get: async (_store: string, key: string) => settings.get(key),
    put: async (_store: string, row: { key: string; value: unknown }) => {
      settings.set(row.key, row);
    },
  }),
}));
const base = (sequence: number) => ({
  eventId: `test-${sequence}`,
  attemptId: "test-attempt",
  learnerId: "test",
  contentVersion: content.id,
  clientSequence: sequence,
  clientTimestamp: "2026-10-07T12:00:00Z",
  serverReceiptTimestamp: null,
});
const node = content.nodes.find((node) => node.id === "C0S1")!;
const wrong = [
  {
    ...base(1),
    type: "core_response",
    nodeId: node.id,
    selectedOptionIds: [node.id + "_MISS"],
    gameAnswer: null,
    gameScore: 0,
    presentationOrder: [],
  } as LearningEvent,
];
function Harness({
  item = node,
  initial = [],
}: {
  item?: Node;
  initial?: LearningEvent[];
}) {
  const [events, setEvents] = useState(initial),
    sequence = useRef(initial.length);
  return (
    <MiniGameStation
      node={item}
      events={events}
      partition="test"
      onNext={() => undefined}
      emit={async (data) => {
        const event = { ...base(++sequence.current), contentVersion: item.contentVersion, ...data } as LearningEvent;
        setEvents((previous) => [...previous, event]);
        return true;
      }}
    />
  );
}
beforeEach(() => settings.clear());
afterEach(cleanup);
describe("station learning transitions", () => {
  it("shows three action choices and enables confirmation only after selecting an action in the focused edition", async () => {
    const item = pelvicTraumaContentV5.nodes.find(n => n.id === "M1N1")!;
    render(<Harness item={item} />);
    const board = await screen.findByRole("region", { name: item.game!.instruction.en });
    expect(board.querySelectorAll("button")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Check my work" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: item.game!.cards.find(c => item.game!.targets!.includes(c.id))!.label.en }));
    expect(screen.getByRole("button", { name: "Check my work" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Check my work" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "I reviewed the evidence" })).toBeInTheDocument());
  });
  it("requires explanation from memory before SBAR choices appear", async () => {
    render(
      <Harness item={content.nodes.find((node) => node.id === "C1S7")!} />,
    );
    expect(screen.queryByRole("region")).toBeNull();
    fireEvent.change(screen.getByRole("textbox"), {
      target: {
        value: "Recurrent hypotension; urgent review; bleeding site uncertain.",
      },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Save reason; build handover" }),
    );
    expect(await screen.findByRole("region")).toBeVisible();
  });
  it("requires first feedback and then explicit correction explanation review", async () => {
    render(<Harness initial={wrong} />);
    expect(screen.queryByText("8 corrected reward collected")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "I reviewed the evidence" }),
    );
    await screen.findByRole("button", { name: /Region 1/ });
    for (let i = 1; i <= 6; i++)
      fireEvent.click(
        screen.getByRole("button", { name: new RegExp(`Region ${i}:`) }),
      );
    fireEvent.click(screen.getByRole("button", { name: "Check my work" }));
    expect(
      await screen.findByRole("button", {
        name: "I reviewed the correction explanation",
      }),
    ).toBeEnabled();
    expect(screen.queryByText("8 corrected reward collected")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", {
        name: "I reviewed the correction explanation",
      }),
    );
    expect(
      await screen.findByText("8 corrected reward collected"),
    ).toBeVisible();
  });
  it("restores unfinished region selections without creating an answer event", async () => {
    const first = render(<Harness />);
    await screen.findByRole("button", { name: /Region 1/ });
    for (let i = 1; i <= 3; i++)
      fireEvent.click(
        screen.getByRole("button", { name: new RegExp(`Region ${i}:`) }),
      );
    await waitFor(() =>
      expect(
        settings.get(`minigame:test:${content.id}:C0S1:0:initial`)?.value,
      ).toMatchObject({ answer: ["ilium", "ischium", "pubis"] }),
    );
    first.unmount();
    render(<Harness />);
    expect(
      await screen.findByText("Sacrum", { selector: "strong" }),
    ).toBeVisible();
  });
  it("restores a correction awaiting acknowledgment instead of awarding early", async () => {
    const answer = node.game!.targets!;
    render(
      <Harness
        initial={[
          ...wrong,
          { ...base(2), type: "feedback_ack", nodeId: node.id },
          {
            ...base(3),
            type: "correction_response",
            correctionId: node.retryId,
            selectedOptionId: node.retryId + "_PASS",
            gameAnswer: answer,
            gameScore: 1,
            feedbackAcknowledged: false,
          },
        ]}
      />,
    );
    expect(
      screen.getByRole("button", {
        name: "I reviewed the correction explanation",
      }),
    ).toBeVisible();
    expect(screen.queryByText("8 corrected reward collected")).toBeNull();
  });
});
