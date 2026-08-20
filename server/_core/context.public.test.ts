import { describe, expect, it, vi } from "vitest";

const getPublicWorkspaceUser = vi.hoisted(() => vi.fn());

vi.mock("../db", () => ({ getPublicWorkspaceUser }));

import { createContext } from "./context";

describe("公開工作階段內容", () => {
  it("不依賴 OAuth 請求，並使用固定公開工作區使用者", async () => {
    const user = {
      id: 731,
      openId: "public-render-workspace",
      name: "公開預測工作區",
      email: null,
      loginMethod: "public",
      role: "admin" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    getPublicWorkspaceUser.mockResolvedValueOnce(user);

    const req = {} as any;
    const res = {} as any;
    const context = await createContext({ req, res, info: {} as any });

    expect(getPublicWorkspaceUser).toHaveBeenCalledOnce();
    expect(context.user).toEqual(user);
    expect(context.req).toBe(req);
    expect(context.res).toBe(res);
  });
});
