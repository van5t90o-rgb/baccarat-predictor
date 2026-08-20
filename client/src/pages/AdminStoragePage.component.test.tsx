// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/AdminShell", () => ({ AdminShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ admin: { storage: { formulaList: { invalidate: vi.fn() }, eventList: { invalidate: vi.fn() } } } }),
    admin: {
      storage: {
        formulaList: { useQuery: () => ({ isLoading: false, data: { items: [{ id: 1, tableId: "A01", roundNo: 4, playerCards: ["4", "5"], bankerCards: ["3", "4"], playerPoint: 9, bankerPoint: 7, winner: "閒", formulas: { VP: {} } }], total: 1, totalPages: 1 } }) },
        eventList: { useQuery: () => ({ isLoading: false, data: { items: [{ id: 2, eventName: "莊6", tableId: "A01", roundNo: 4, 點差: "莊", 理數: "閒", 導數: "莊", 真數: "閒", HZ: "和", 價值: "莊" }], total: 1, totalPages: 1 } }) },
        removeFormula: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        removeEvent: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        exportData: { useQuery: () => ({ refetch: vi.fn(), isFetching: false }) },
        importData: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      },
    },
  },
}));

import AdminStoragePage from "./AdminStoragePage";

describe("後台儲存空間分頁", () => {
  afterEach(() => cleanup());

  it("切換至事件儲存時顯示事件欄位與事件資料", () => {
    render(<AdminStoragePage />);
    expect(screen.getByText("公式數")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "事件儲存" }));
    expect(screen.getAllByText("事件").length).toBeGreaterThan(0);
    expect(screen.getByText("莊6")).toBeTruthy();
    expect(screen.queryByText("公式數")).toBeNull();
  });

  it("提供受保護的 CsvManager 匯入與匯出控制", () => {
    render(<AdminStoragePage />);
    expect(screen.getByTestId("admin-csv-transfer")).toBeTruthy();
    expect(screen.getByRole("button", { name: "公式 CSV" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "事件 CSV" })).toBeTruthy();
    expect(screen.getByLabelText("選擇 CSV 檔案")).toBeTruthy();
  });
});
