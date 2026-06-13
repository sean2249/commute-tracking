# UI 修改計畫：區隔「追蹤狀態卡」與「打卡按鈕」

> 此檔為遠端 session 產出的計畫，供本機端接力實作。

## Context（為什麼要改）

主畫面（`public/index.html`）由上而下有兩張外觀相近的卡片：

- **中間卡** `#status-strip`（`.status-strip`）：追蹤中的**資訊顯示**，幾乎不可點，只有右側 undo 小膠囊可點。追蹤態為綠色 `--leaf-soft`。
- **下方卡** `#primary-action`（`.primary-action`）：**整塊是按鈕**，按下會打卡（上車 board／下車 alight）。暖黃 `--am-soft`／涼色 `--pm-soft`。

兩者共用了幾乎相同的「車票」視覺語言——同樣的 `--r-sm` 圓角、`--shadow-1` 陰影、`--ticket-texture` 紙紋、相近的撕邊/打孔造型與尺寸，且緊貼相鄰。使用者回報**容易混淆、有時誤觸中間卡**。誤觸中間卡不只是無效操作，還可能點到 undo 膠囊而刪掉剛上車的紀錄。

目標：讓「可點的（按鈕）」與「只顯示的（狀態卡）」在造型、層級、間距上明確分流，降低誤觸。三個方向皆以 **CSS 為主，不更動 `js/index-page.js` 的互動邏輯**。

涉及檔案（以 selector 定位，避免行號 stale）：
- `public/css/index.css`（中間卡 `.status-strip` 系列、下方卡 `.primary-action` 系列）— 主要改動處
- `public/css/tokens.css`（既有 token，重用，不新增）
- `public/index.html`（`#status-strip` / `.entry-buttons`；僅方向 C 可能加一行提示文字 / glyph）

可重用的既有資源（**不要新造**，皆定義於 `tokens.css`）：
- `--shadow-1`（淺）/ `--shadow-2`（深）
- `--surface-press` 按壓色
- `--r-sm`(3px) / `--r-lg`(14px)
- `--sp-6`(24)/`--sp-8`(32)/`--sp-10`(40) 間距
- 按鈕既有 `.primary-action:active` 下沉動畫
- `--leaf` / `--leaf-deep` / `--leaf-soft` 綠色系（中間卡追蹤態）

---

## 方向 A — 層級對比（資訊在上、按鈕在下）｜風險最低

讓「會凸起的才可點」。

1. **下方按鈕更像實體按鈕**：`.primary-action` 的 `box-shadow` 由 `--shadow-1` 改為 `--shadow-2`；`:active` 時下沉動畫已存在，保留即可。可選：`pas-cn` 站名字級由 30px 微升、或加粗強化召喚力。
2. **中間卡改為平面/內凹資訊面板**：在 `.status-strip` 移除 `box-shadow`（或改 `box-shadow: none`），改用淡內陰影 `box-shadow: inset 0 1px 2px rgba(0,0,0,.06)`；維持背景與綠色追蹤態不變。讓它「凹進去 = 不可按」。
3. **拉開間距**：`.status-strip` 的 `margin-bottom` 由 `--sp-6` 加大到 `--sp-8`。

範圍：純 `index.css` 改 3 處。視覺風格幾乎不變，最安全。

## 方向 B — 造型區隔（票券語言只留給按鈕）｜語意最清楚

把「車票感（打孔/撕邊/票紋理）」設為**唯一可點的訊號**。

1. **中間卡去票券化**：在 `.status-strip[data-state="tracking"]` 移除鋸齒撕邊 `::before/::after`；票紋理 `--ticket-texture` 因 `background: var(--leaf-soft)` 簡寫已被清掉，無須額外處理。
2. **換成資訊面板造型**：`.status-strip` 改用較大圓角 `--r-lg`，左側加一條 `--leaf` 色彩條（`border-left: 3px solid var(--leaf-deep)` 或 `::before` 直條），維持綠色但不再像票。
3. **按鈕保留票券造型 + 暖色不動**（`.primary-action` 打孔 `::before/::after`、`pas-punch` 全留）。

結果：之後「打孔票 = 可按」對應一致。視覺改動較明顯，需確認你接受新外觀。範圍：純 `index.css`。

## 方向 C — 空間 + 明確 CTA｜改動最輕、區隔最弱

保留兩卡造型，主攻引導視線與避免誤觸。

1. **加大間距**：同方向 A 第 3 點（`--sp-6`→`--sp-8`/`--sp-10`）。
2. **按鈕加互動提示**：把現有幾乎隱形的 `.primary-action__hint`（8px、`--ink-faint`）內容/樣式強化為明確 CTA（例：「輕觸打卡」+ 箭頭 glyph），或在 `pas-punch` 的 `pas-ticks` 上方加一個輕觸 glyph。需在 `index.html` 的 `#primary-action-hint` / `js` 設定文字。
3. **確保中間卡不吃誤觸**：在 `.status-strip` 非互動區設定 `pointer-events`，只放行 `.undo-pill`/`.retry-pill`，避免點到空白區誤觸（目前點空白雖無動作，但加上更保險），undo 膠囊保持 `pointer-events:auto`。

範圍：`index.css` + 可能 `index.html`/`index-page.js` 一行文字。

---

## 建議落地順序

A 為基礎（低風險、先做），再視效果疊加 B 的造型區隔；C 的「加大間距」併入 A，CTA 文字可選。三者不衝突，可組合。

> **實際落地：方向 B（單獨）。** 比稿後選擇 B、未疊 A——A 的陰影/內凹在暗色主題對比太弱。`.status-strip` 改大圓角 `--r-lg`、tracking 態移除鋸齒撕邊並改用左側 `--leaf-deep` accent bar（重用 `::before` + `overflow:hidden`），按鈕維持撕邊票造型。同步 bump `sw.js` 的 `VERSION`。

## 驗證方式

1. 本機開啟：在 `public/` 起簡單靜態伺服器（如 `python3 -m http.server`）開 `index.html`。
2. 模擬三種狀態檢查中間卡外觀：用 DevTools 將 `#status-strip` 的 `data-state` 切成 `empty` / `tracking` / `success`，確認與下方 `#primary-action` 在**造型、陰影層級、間距**上明顯可區分。
3. 真機/窄螢幕（iPhone 寬度 ~390px）目視：兩卡是否一眼分得出「上面是顯示、下面是按鈕」；手指落在中間卡時不會誤觸 undo。
4. 切換亮/暗主題（`data-theme`）與涼色 `data-color="cool"`，確認對比與顏色在兩種模式都成立。
5. 確認既有打卡流程（board/alight、long-press 換方向、undo 倒數）未受影響——本計畫不動 JS 邏輯。

開發分支：`claude/ui-middle-bottom-confusion-qz2eou`。
