# 自訂公式設計確認紀錄

本功能的介面設計已依使用者確認的最終來源驅動方向完成實作。確認版示意圖儲存於：

`/home/ubuntu/webdev-static-assets/custom-formula-management-previous-pair-builder-mockup.png`

使用者確認的規則流程如下：先選擇來源，再設定各來源的權重、合併運算與三態預測；不使用 Formula.py 範本作為起點，且不得覆寫原有十八項公式。

| 已確認項目 | 實作對應 |
|---|---|
| 閒／莊牌面權重可共用或獨立 | `cardWeightMode`、`sharedCardWeights`、`playerCardWeights`、`bankerCardWeights` |
| A–K 各牌面獨立權重 | 管理頁的牌面權重表格與 `Record<1..13, number>` 規則欄位 |
| 閒／莊本局點數 0–9 各別權重 | `playerPoint.weights`、`bankerPoint.weights` |
| 局數來源 | `round.enabled`、`round.coefficient` |
| 前局雙來源資料 | 來源 A／B 可分別選取閒／莊點數或第 1–3 張牌 |
| 四則運算與絕對差額 | 白名單 `+ - * /`、`absolute`、安全除法 |
| 結果預測 | 大於零、低於零、等於零各自選擇閒／莊／和 |
| 公式操作 | 新增、列表、啟用切換、預覽與可見的「刪除新公式」按鈕 |

示意圖屬於已確認的設計依據；正式可操作介面位於 `/custom-formulas`，並已整合至本局分析頁。
