# Interface Verification Notes

- Desktop layout now applies the intended navy, warm-gold and soft-gray design system across the shared sidebar and four primary routes.
- The dashboard visually preserves the blueprint's statistic strip, paired player/banker cards, dual-column prediction area and formula panel hierarchy.
- The cards, storage and CSV screens render as responsive management panels with their intended search, table, pagination and operational control surfaces.
- Formula-history dialog and the Storage.py-aligned formula deposit form were added after the initial desktop capture; they require a follow-up desktop and mobile visual pass before final delivery.

The follow-up desktop pass confirms that the dashboard exposes the history-record entry point and the storage page exposes the formula-record deposit trigger without disrupting the shared visual hierarchy. The mobile pass confirms that all four routes retain a readable single-column layout, the sidebar becomes a compact top trigger, and action controls remain reachable. Data tables preserve their horizontal scroll behavior on narrow screens rather than compressing critical source columns.

## 自訂公式功能驗證

- 桌面版自訂公式管理頁已確認側邊欄入口、來源分段、共用／獨立閒莊牌面權重、閒／莊點數權重、局數、前局雙來源運算器、最終預測條件及已建立公式清單皆正常呈現。
- 桌面版本局分析頁維持既有牌面輸入、最佳公式、事件預警與歷程結果佈局；完成本局分析後，啟用中的自訂公式會顯示其三態預測與運算值。
- 375px 行動版自訂公式頁會將來源面板依序堆疊，牌面／點數權重格及運算控制項均可見，未發現橫向截斷。
- `pnpm check`、`pnpm test` 與 `pnpm build` 均已通過；測試包含 customFormulas 的 MySQL 實際 CRUD 持久化驗證。
