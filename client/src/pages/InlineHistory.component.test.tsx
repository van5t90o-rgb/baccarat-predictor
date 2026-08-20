// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InlineHistory } from "./Home";

const rows = Array.from({ length: 13 }, (_, index) => ({
  id: index + 1,
  roundNo: index + 1,
  nextRoundNo: index + 2,
  formula: "差額",
  prediction: index % 2 === 0 ? "閒" : "莊",
  hits: index,
  accuracy: 50,
  streak: 0,
  reversed: false,
  actualWinner: index === 12 ? "" : "閒",
  status: index === 0 ? "hit" : index === 1 ? "miss" : index === 12 ? "pending" : "hit",
}));

describe("InlineHistory", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("掛載十三筆資料後顯示三種狀態並啟動自動捲動", () => {
    let frame: FrameRequestCallback | undefined;
    const requestFrame = vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1; });
    vi.spyOn(performance, "now").mockReturnValue(0);
    vi.stubGlobal("requestAnimationFrame", requestFrame);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    render(<InlineHistory rows={rows as never} loading={false} active />);
    const viewport = screen.getByTestId("history-viewport");
    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 320 },
      scrollHeight: { configurable: true, value: 960 },
    });
    expect(screen.getAllByText("✓ 命中").length).toBeGreaterThan(0);
    expect(screen.getAllByText("未命中").length).toBeGreaterThan(0);
    expect(screen.getAllByText("待下一局").length).toBeGreaterThan(0);
    expect(screen.getAllByText("✓ 命中")[0].closest(".grid")?.className).toContain("bg-[#F0FBF5]");
    expect(screen.getAllByText("未命中")[0].closest(".grid")?.className).toContain("bg-[#FFF9F9]");
    expect(screen.getAllByText("待下一局")[0].closest(".grid")?.className).toContain("bg-[#FCFDFE]");
    expect(requestFrame).toHaveBeenCalled();
    act(() => frame?.(20));
    expect(viewport.scrollTop).toBeGreaterThan(0);
  });
});
