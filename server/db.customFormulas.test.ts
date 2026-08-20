import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildDefaultRule } from "./customFormula";
import { createCustomFormula, deleteCustomFormula, listCustomFormulas, updateCustomFormulaEnabled } from "./db";

const TEST_USER_ID = 987_654_321;

async function clearTestRules() {
  const existing = await listCustomFormulas(TEST_USER_ID);
  await Promise.all(existing.map(rule => deleteCustomFormula(TEST_USER_ID, rule.id)));
}

describe.runIf(Boolean(process.env.DATABASE_URL))("customFormulas MySQL 持久化", () => {
  beforeEach(async () => { await clearTestRules(); });
  afterEach(async () => { await clearTestRules(); });

  it("建立、讀取、啟用切換與刪除都會反映在資料庫狀態", async () => {
    const rule = buildDefaultRule();
    await createCustomFormula({ userId: TEST_USER_ID, name: "持久化驗證公式", rules: rule, isEnabled: true });
    const [created] = await listCustomFormulas(TEST_USER_ID);
    expect(created).toMatchObject({ userId: TEST_USER_ID, name: "持久化驗證公式", isEnabled: true, rules: expect.objectContaining({ version: 1, cardWeightMode: "independent" }) });

    await updateCustomFormulaEnabled(TEST_USER_ID, created.id, false);
    expect((await listCustomFormulas(TEST_USER_ID))[0]?.isEnabled).toBe(false);

    await deleteCustomFormula(TEST_USER_ID, created.id);
    await expect(listCustomFormulas(TEST_USER_ID)).resolves.toEqual([]);
  });
});
