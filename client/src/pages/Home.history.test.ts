import { describe, expect, it } from "vitest";
import { HISTORY_ROW_HEIGHT, HISTORY_VISIBLE_ROWS, historyStatusClass, shouldAutoScrollHistory } from "./Home";

describe("內嵌公式歷程", () => {
  it("固定以十二列、每列 64 像素建立可視區高度", () => {
    expect(HISTORY_VISIBLE_ROWS).toBe(12);
    expect(HISTORY_ROW_HEIGHT).toBe(64);
    expect(HISTORY_VISIBLE_ROWS * HISTORY_ROW_HEIGHT).toBe(768);
  });

  it("僅在第十三筆開始啟動自動捲動", () => {
    expect(shouldAutoScrollHistory(12)).toBe(false);
    expect(shouldAutoScrollHistory(13)).toBe(true);
  });

  it("為命中、未命中與待下一局套用不同的狀態樣式", () => {
    expect(historyStatusClass("hit")).toContain("bg-[#F0FBF5]");
    expect(historyStatusClass("miss")).toContain("bg-[#FFF9F9]");
    expect(historyStatusClass("pending")).toContain("bg-[#FCFDFE]");
  });
});
