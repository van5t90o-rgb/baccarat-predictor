import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  createAdminCredential: vi.fn(),
  getAdminCredential: vi.fn(),
  updateAdminCredentialPassword: vi.fn(),
}));

import { adminCookieOptions, hashPassword, issueAdminSession, verifyPassword } from "./adminAuth";

describe("後台帳密安全處理", () => {
  const priorSecret = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.JWT_SECRET = priorSecret;
  });

  it("以隨機鹽值產生不可逆密碼雜湊，並能驗證正確密碼", async () => {
    const credential = await hashPassword("123456");
    expect(credential.hash).not.toBe("123456");
    expect(credential.salt).toHaveLength(43);
    await expect(verifyPassword("123456", credential.salt, credential.hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", credential.salt, credential.hash)).resolves.toBe(false);
  });

  it("簽發包含帳號與工作階段版本的 JWT 工作階段", async () => {
    process.env.JWT_SECRET = "test-session-secret";
    const token = await issueAdminSession({ username: "admin", version: 2 });
    expect(token.split(".")).toHaveLength(3);
    expect(token).not.toContain("123456");
  });

  it("後台 Cookie 採 HTTP-only、同站與有限時效設定", () => {
    const options = adminCookieOptions();
    expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
    expect(options.maxAge).toBeGreaterThan(0);
  });
});
