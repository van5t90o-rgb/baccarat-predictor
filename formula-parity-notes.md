# Formula.py Parity Notes

原始 `Formula.py` 將十八項公式結果正規化為 `{name, value, prediction, success, error}`。歷史命中分析以「第 N 局公式預測」對照「第 N+1 局 winner」建立配對；若下一局為和局，沿用前一次命中結果，若為第一筆配對則視為命中。只有可正常預測且 prediction 非空白的公式可參與最佳公式決策。

當分析總數少於五筆時，原始流程固定使用「差額」公式：連勝直接預測，連敗反打，其他模式直接使用差額。五筆以上時，流程先比較最高連勝與最高連敗，再以唯一候選、候選預測一致或藍色決策（歷史命中數相對最高不命中數）解決；無法唯一決定時必須回傳空決策與對應 reason。Web 端必須保留 `best_formula`、`streak_type`、`streak_count`、`hits`、`accuracy`、`analysis_total`、`reversed`、`reason` 的相容行為。

本次比對確認十八項公式與最佳公式的核心實作可與固定六局參考資料相符；實際流程差異出在路由層。原始 `app.py` 的勝負數以目前畫面輸入值累加，Web 版先前錯誤沿用最後一筆記錄的統計，已改正。原始 `Formula.get_previous()` 僅能取得「目前局數減一」的紀錄，Web 版先前直接使用最後一筆記錄，已改為依 `current.roundNo - 1` 精確查詢。測試現以六局、108 項公式輸出與六次最佳公式決策作為回歸基準。
