// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/AdminShell", () => ({ AdminShell: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-shell">{children}</div> }));
vi.mock("@/lib/trpc", () => ({ trpc: { admin: { storage: { formulaList: { useQuery: () => ({ data: { total: 8 } }) }, eventList: { useQuery: () => ({ data: { total: 5 } }) } } } } }));

import AdminDashboardPage from "./AdminDashboardPage";

describe("後台管理首頁", () => {
  it("呈現儲存資料、事件資料、帳號安全與主要管理入口", () => {
    render(<AdminDashboardPage />);
    expect(screen.getByTestId("admin-dashboard-page")).toBeTruthy();
    expect(screen.getByText("後台管理")).toBeTruthy();
    expect(screen.getByText("公式紀錄")).toBeTruthy();
    expect(screen.getByText("事件儲存")).toBeTruthy();
    expect(screen.getByText("帳號安全")).toBeTruthy();
    expect(screen.getByText("前往儲存空間")).toBeTruthy();
    expect(screen.getByText("帳號與密碼")).toBeTruthy();
  });
});
