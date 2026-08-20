// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const cardWeights = Object.fromEntries(Array.from({ length: 13 }, (_, index) => [String(index + 1), 1]));
  const pointWeights = Object.fromEntries(Array.from({ length: 10 }, (_, index) => [String(index), 1]));
  return {
    createMutate: vi.fn(), setEnabledMutate: vi.fn(), removeMutate: vi.fn(),
    rule: {
      version: 1 as const, cardWeightMode: "independent" as const, sharedCardWeights: cardWeights, playerCardWeights: { ...cardWeights }, bankerCardWeights: { ...cardWeights },
      playerCard: { enabled: true, position: "all" as const, operation: "+" as const, coefficient: 1 }, bankerCard: { enabled: true, position: "all" as const, operation: "-" as const, coefficient: 1 },
      playerPoint: { enabled: false, operation: "+" as const, coefficient: 1, weights: { ...pointWeights } }, bankerPoint: { enabled: false, operation: "-" as const, coefficient: 1, weights: { ...pointWeights } },
      round: { enabled: false, operation: "+" as const, coefficient: 1 }, previousExpressions: [], positivePrediction: "閒" as const, negativePrediction: "莊" as const, zeroPrediction: "和" as const,
    },
  };
});

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ baccarat: { customFormulas: { list: { invalidate: vi.fn() } } } }),
    baccarat: { customFormulas: {
      defaults: { useQuery: () => ({ data: mocks.rule }) },
      list: { useQuery: () => ({ data: [{ id: 8, name: "已儲存規則", isEnabled: true }], isLoading: false }) },
      create: { useMutation: () => ({ mutate: mocks.createMutate, isPending: false }) },
      setEnabled: { useMutation: () => ({ mutate: mocks.setEnabledMutate }) },
      remove: { useMutation: () => ({ mutate: mocks.removeMutate, isPending: false }) },
    } },
  },
}));

import CustomFormulasPage from "./CustomFormulasPage";

describe("自訂公式管理頁", () => {
  beforeEach(() => { mocks.createMutate.mockReset(); mocks.setEnabledMutate.mockReset(); mocks.removeMutate.mockReset(); });
  afterEach(() => cleanup());

  it("顯示閒莊獨立牌面權重與可新增的前局雙來源運算器", () => {
    render(<CustomFormulasPage />);
    expect(screen.getByText("閒方牌面權重")).toBeTruthy();
    expect(screen.getByText("莊方牌面權重")).toBeTruthy();
    fireEvent.click(screen.getByText("加入前局資料"));
    expect(screen.getByText("前一局資料 1")).toBeTruthy();
    expect(screen.getByText("取絕對差額")).toBeTruthy();
  });

  it("以目前可見規則建立公式，並允許刪除已建立公式", () => {
    render(<CustomFormulasPage />);
    fireEvent.change(screen.getByPlaceholderText("例如：前局差額牌面加權"), { target: { value: "我的規則" } });
    fireEvent.click(screen.getByText("儲存新公式"));
    expect(mocks.createMutate).toHaveBeenCalledWith(expect.objectContaining({ name: "我的規則", rules: expect.objectContaining({ cardWeightMode: "independent" }) }));
    fireEvent.click(screen.getByText("刪除新公式"));
    expect(mocks.removeMutate).toHaveBeenCalledWith({ id: 8 });
  });
});
