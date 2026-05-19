# Frontend Design Spec

> 個人通勤紀錄 PWA — 視覺與互動規範
> 目標裝置：iPhone 13/14/15 Pro（393×852 CSS px），桌面 Chrome 為次要。
> 本文件不含實作程式碼，僅供工程師照規格實作。

---

## 1. Design System

設計的核心錨點：**minimal、dense、fast**。靈感是 Linear 的克制 + 70 年代公車時刻表的等寬數字感。所有 token 以 CSS Custom Properties 形式定義在 `:root`，並在 `:root[data-theme="dark"]` 與 `@media (prefers-color-scheme: dark)` 下覆寫。

### 1.1 Color tokens

選色理由：使用 **slate / zinc 中性色**做為背景與文字（冷調、不搶眼，數字易讀），accent 採用 **amber（#F59E0B 系）**。理由有三：

1. 黃色與公車意象同源（校車黃、站牌黃），語義對。
2. amber 在 light/dark 雙模下都能維持 4.5:1 以上對比。
3. 與 success（green）、danger（red）、warning（橘紅）色相距離夠遠，狀態色不會混淆。

> 若日後嫌 amber 太「警示」，備案為 teal `#14B8A6`，但需重新校 success 色避免衝突。

#### Light mode

| Token              | Hex       | 用途                                 |
| ------------------ | --------- | ------------------------------------ |
| `--bg`             | `#FAFAF9` | 全域背景（zinc-50 微暖）             |
| `--bg-elevated`    | `#FFFFFF` | 卡片、status strip、模態背景         |
| `--fg`             | `#18181B` | 主要文字（zinc-900）                 |
| `--fg-muted`       | `#71717A` | 次要文字、placeholder、weekday 標籤  |
| `--fg-subtle`      | `#A1A1AA` | 表格分隔線旁的提示文字、icon stroke  |
| `--accent`         | `#F59E0B` | 主要按鈕、focus ring、active row     |
| `--accent-hover`   | `#D97706` | 按鈕 hover/active 加深               |
| `--accent-fg`      | `#1C1917` | accent 背景上的文字（深色，非白）    |
| `--success`        | `#16A34A` | 成功 toast、✅ 圖示                  |
| `--success-bg`     | `#DCFCE7` | success 狀態列背景                   |
| `--warning`        | `#D97706` | 預測信心低、缺料提示                 |
| `--warning-bg`     | `#FEF3C7` | warning 狀態列背景                   |
| `--danger`         | `#DC2626` | 刪除、錯誤                           |
| `--danger-bg`      | `#FEE2E2` | error toast 背景                     |
| `--border`         | `#E4E4E7` | 卡片邊線、表格分隔線                 |
| `--border-strong`  | `#D4D4D8` | input 邊線、focus 前態               |
| `--surface-hover`  | `#F4F4F5` | row hover、按鈕未按時的微弱 hover    |
| `--surface-press`  | `#E4E4E7` | 按鈕按下的瞬間色                     |

#### Dark mode

| Token              | Hex       | 備註                                       |
| ------------------ | --------- | ------------------------------------------ |
| `--bg`             | `#09090B` | zinc-950，真黑會在 OLED 上太刺眼，故微亮   |
| `--bg-elevated`    | `#18181B` | 卡片                                       |
| `--fg`             | `#FAFAF9` | 主要文字                                   |
| `--fg-muted`       | `#A1A1AA` |                                            |
| `--fg-subtle`      | `#71717A` |                                            |
| `--accent`         | `#FBBF24` | amber-400，dark mode 略提亮維持對比        |
| `--accent-hover`   | `#F59E0B` |                                            |
| `--accent-fg`      | `#1C1917` | accent 上仍用深色文字                      |
| `--success`        | `#22C55E` |                                            |
| `--success-bg`     | `#14532D` |                                            |
| `--warning`        | `#FBBF24` |                                            |
| `--warning-bg`     | `#451A03` |                                            |
| `--danger`         | `#F87171` |                                            |
| `--danger-bg`      | `#450A0A` |                                            |
| `--border`         | `#27272A` |                                            |
| `--border-strong`  | `#3F3F46` |                                            |
| `--surface-hover`  | `#27272A` |                                            |
| `--surface-press`  | `#3F3F46` |                                            |

對比驗證：所有 `--fg` on `--bg`、`--accent-fg` on `--accent` 至少 7:1（AAA）；`--fg-muted` on `--bg` 至少 4.5:1（AA）。

### 1.2 Typography

#### Font stacks

- **Prose（介面、按鈕文字）**：
  `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", ui-sans-serif, system-ui, sans-serif`
- **Mono（時間、分鐘數、表格數字、ETA）**：
  `ui-monospace, "SF Mono", "Menlo", "Cascadia Mono", "Roboto Mono", monospace`

所有「數字 + 單位」一律走 mono；按鈕標籤、節標題、表格欄位文字走 prose。

#### Size scale

| Token      | Size  | line-height | 用途                              |
| ---------- | ----- | ----------- | --------------------------------- |
| `--fs-xs`  | 11px  | 1.4         | weekday、icon caption、micro nav  |
| `--fs-sm`  | 13px  | 1.45        | 表格內文、note 截斷文字           |
| `--fs-base`| 15px  | 1.5         | 一般 UI 文字、按鈕副標            |
| `--fs-lg`  | 18px  | 1.4         | 按鈕主標籤、section 小標          |
| `--fs-xl`  | 22px  | 1.3         | 頁標、狀態條主資訊（時間 + ETA）  |
| `--fs-2xl` | 28px  | 1.2         | charts 頁的 hero 數字（總筆數）   |

字重：prose 用 400 / 500 / 600（不引入 700 以免裝置 fallback 不一致）。mono 用 400 / 500。

`font-feature-settings: "tnum" 1, "cv11" 1`：mono 強制 tabular numbers，數字欄寬一致；prose 用 SF 的 cv11（更易讀的 6/9）。

### 1.3 Spacing / Radius / Shadow / Motion

#### Spacing scale（4px base）

| Token      | px  | 用途                                  |
| ---------- | --- | ------------------------------------- |
| `--sp-1`   | 4   | icon 內距、tag padding                |
| `--sp-2`   | 8   | row 內垂直 padding                    |
| `--sp-3`   | 12  | 列表 item 間距                        |
| `--sp-4`   | 16  | 卡片 padding、區塊基礎間距            |
| `--sp-6`   | 24  | section 之間                          |
| `--sp-8`   | 32  | 頁首到內容                            |
| `--sp-12`  | 48  | charts 頁的 section 大間距            |

#### Radius scale

| Token         | px       | 用途                              |
| ------------- | -------- | --------------------------------- |
| `--r-sm`      | 4        | tag、chip                         |
| `--r-md`      | 8        | input、小按鈕                     |
| `--r-lg`      | 12       | 卡片、status strip                |
| `--r-xl`      | 16       | 四大按鈕                          |
| `--r-full`    | 9999px   | filter chip、settings gear hit area |

#### Shadow（單一柔影系統，elevation 只有兩階）

- `--shadow-1`：`0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.03)`（卡片預設）
- `--shadow-2`：`0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)`（按下、展開的 row）

Dark mode 將 alpha 從 0.04/0.08 提升至 0.4/0.6，且改用純黑 `rgba(0,0,0,*)`，因 elevated 卡片本身已比背景亮。

#### Motion

| Token            | duration | easing                                       | 用途                                    |
| ---------------- | -------- | -------------------------------------------- | --------------------------------------- |
| `--motion-fast`  | 120ms    | `cubic-bezier(0.2, 0, 0, 1)`                 | 按下反饋、chip toggle                   |
| `--motion-base`  | 200ms    | `cubic-bezier(0.2, 0, 0, 1)`                 | row 展開、status strip 內容切換         |
| `--motion-slow`  | 320ms    | `cubic-bezier(0.34, 1.56, 0.64, 1)`（spring）| 新 log 進入 status strip 的彈入         |
| `--motion-page`  | 0ms      | n/a                                          | 頁面間切換不做轉場（PWA 多頁、不必要） |

`prefers-reduced-motion: reduce` 下，所有 duration 強制改為 0ms，但 opacity 過渡保留 80ms 避免閃爍。

### 1.4 Touch targets / Safe areas

- 四大按鈕：最小 88×88，實際視覺尺寸 ~170×96（兩欄滿版扣間距）。
- 次級按鈕（status strip 內的 Undo、row 內的 Delete）：最小 44×44 hit area，視覺可較小（內間距撐開）。
- filter chip：高度 36，hit area 高度 44（透明 padding）。
- nav 連結（底部）：高度 48 + `env(safe-area-inset-bottom)`。
- gear 圖示：視覺 20×20，hit area 44×44。

Safe area 規則：

- `index.html` body padding-top 用 `max(--sp-4, env(safe-area-inset-top))`，padding-bottom 用 `calc(56px + env(safe-area-inset-bottom))`（56 是 nav 高）。
- 底部 nav `position: sticky; bottom: 0;` 並以 `padding-bottom: env(safe-area-inset-bottom)` 把按鈕推到 home indicator 上方。
- 橫向 padding 用 `max(--sp-4, env(safe-area-inset-left))`（瀏海橫拿時需要）。

### 1.5 Iconography

全部以 **inline SVG** 提供，stroke-based，`stroke-width: 1.5`，`stroke: currentColor`，`fill: none`。尺寸 16 或 20。不引入 icon font。

需要的 icons（共 12 個）：

| 名稱            | 視覺描述                                            | 用處                              |
| --------------- | --------------------------------------------------- | --------------------------------- |
| `gear`          | 八齒輪 + 中心圓                                     | header 右側通往 unlock            |
| `chevron-right` | 右指 V 字                                           | 列表項展開指示                    |
| `chevron-down`  | 下指 V 字                                           | row 展開狀態                      |
| `trash`         | 垃圾桶蓋 + 桶身                                     | row 內 delete                     |
| `undo`          | 彎曲箭頭迴轉                                        | status strip 的 undo              |
| `bar-chart`     | 三根高低不一直條                                    | 底部 nav charts                   |
| `list`          | 三條水平短線                                        | 底部 nav log                      |
| `home`          | 山形房子                                            | 底部 nav index                    |
| `sun`           | 中心圓 + 八道短射線                                 | weather: clear                    |
| `cloud`         | 雲朵輪廓                                            | weather: cloudy                   |
| `cloud-rain`    | 雲 + 三短斜線                                       | weather: rain                     |
| `wind`          | 兩條曲線箭頭                                        | weather: windy                    |
| `help-circle`   | 圓中問號（也作 unknown weather fallback）           | weather: unknown                  |

所有 weather icon 在「無資料」狀態下：`stroke: var(--fg-subtle)`，`opacity: 0.5`。

---

## 2. UX Decisions（七題）

### 2.1 Status strip vs toast — 採持久卡片

狀態條為「直到下一次紀錄前都可見」的卡片，固定在按鈕網格上方。
**理由**：使用者下車後可能立刻收起手機，幾秒後想再看一眼「我剛打到了嗎、ETA 幾點」，transient toast 已經消失就得重開 log 頁。持久卡片讓「確認 + 看 ETA」兩個動作合而為一。

但 Undo 子元件採 10 秒倒數後淡出（見 2.3）。

### 2.2 Geolocation permission — 首次按下任一按鈕時要求，非首屏

在使用者第一次點四大按鈕之一時觸發 `navigator.geolocation.getCurrentPosition`，並在 status strip 顯示「Locating…」骨架。
**理由**：首屏問權限會嚇跑使用者，且我們不需要位置就能打卡（位置只用於 weather lookup）。延遲到第一次按下時，使用者已表達意圖，iOS 的權限對話框不會打斷流程。權限若拒絕，weather 直接走 fallback（見 2.4），不再追問。

### 2.3 Misclick recovery — status strip 內的 Undo，10 秒倒數

剛紀錄完的 status strip 右側出現 `Undo (10)` 倒數按鈕，按下即發 RPC 刪除最新一筆並回滾狀態條為前一筆（或空狀態）。10 秒後 Undo 灰化並隱藏，狀態條本體保留資訊。
**理由**：在 hero surface 上原地撤銷比「滑到 log 頁找最新一筆刪除」快 5 倍以上。10 秒覆蓋「下車後抬頭發現按錯」的時間窗。

log 頁的 row delete 仍保留，做為超過 10 秒後的補救路徑。**不**做 swipe-to-delete，因為單手橫滑在站立公車上誤觸高。

### 2.4 Weather fallback — 灰階 `help-circle` 圖示 + em-dash 溫度

無 weather 資料時：圖示換成 `help-circle`、`opacity: 0.5`、溫度欄顯示 `—°`（mono em-dash + 度符號）。tooltip / aria-label 為 "Weather unavailable"。
**理由**：保持欄位排版穩定（不留空），灰階明確區分「真的沒資料」與「資料是 0°」。em-dash 是表格界的通用「無資料」記號，比 "N/A" 安靜。

### 2.5 Prediction with insufficient samples — 顯示 "ETA · 累積中 n/3"

當全域樣本 n<3 無法預測：

```
Logged 08:12 · 上班-上車
ETA  累積中 (2/3)
```

「累積中」用 `--fg-muted`、mono 字體、灰底細邊框 pill 包住 `(2/3)`。樣本到 3 後自動切回正常 ETA。
**理由**：給使用者進度感（再 1 筆就會有預測），而不是冷淡的「no data」。pill 的 2/3 也是一種隱藏的 onboarding。

### 2.6 Charts empty states — 三階梯

每張圖三個狀態：

- **0 events**：圖區內顯示居中的 `--fg-muted` 文案「尚無紀錄。從首頁開始打卡。」+ 一個小的 list icon。canvas 不渲染。
- **<10 events（樣本不足）**：渲染現有資料點，但上覆 `--warning-bg` 半透明條帶，置頂顯示「n=7，樣本偏少」標籤。圖仍可讀，提醒解讀謹慎。
- **≥10 events**：正常顯示。

對每張圖的差異：

- 圖 1（duration trend）：<10 時不畫移動平均線，只畫散點。
- 圖 2（boarding scatter）：<10 時 dot 半透明 0.6，提示資料稀疏。
- 圖 3/4（weather/weekday bar）：任一分組樣本 <3，該 bar 改為斜紋 pattern 並標註小字 `n=2`。

### 2.7 PWA cold-start perception — inline critical CSS

由於無 build step，策略如下：

- 每個 HTML 在 `<head>` 內 `<style>` 直接寫**首屏 critical CSS**：CSS variables、reset、`<body>` 排版、header、按鈕網格骨架（index）、表格骨架（log）、chart skeleton（charts）。預估每頁 inline CSS < 3KB。
- 其餘樣式（hover 細節、展開動畫、低用率元件）放在 `app.css` 用 `<link rel="stylesheet">` 載入。
- 字型純走系統字，無 FOIT。
- index 的四大按鈕在 JS 載入前就完整可見且可按（按下時 button 立即視覺反饋，RPC 由 JS 接管後才送）。實作上 button 用原生 `<button>`，無 JS 也能點，只是無法送出—文案可在 `<noscript>` 略提。

第一個有意義內容（按鈕網格可點）目標 < 200ms（PWA 已快取的情況）。

---

## 3. Surfaces

> ASCII 比例：1ch ≈ 8 CSS px。iPhone 寬 393 ≈ 49ch。下文 wireframe 統一以 50ch 寬呈現。

### 3.1 `index.html` — 主入口

#### 3.1.1 Wireframe

```
+------------------------------------------------+
| Commute                              [gear]    |  <- header (48h)
+------------------------------------------------+
|                                                |
|  +------------------------------------------+  |
|  | 08:12  上班-上車                  Undo(8)|  |  <- status strip
|  | ETA  08:47  · n=42 · ±3min               |  |     (~88h)
|  | [sun]  28°                               |  |
|  +------------------------------------------+  |
|                                                |
|  +----------------+  +----------------+        |
|  |                |  |                |        |
|  |   上班 - 上車  |  |   上班 - 下車  |        |  <- 4 buttons
|  |                |  |                |        |     each ~170x96
|  +----------------+  +----------------+        |
|  +----------------+  +----------------+        |
|  |                |  |                |        |
|  |   下班 - 上車  |  |   下班 - 下車  |        |
|  |                |  |                |        |
|  +----------------+  +----------------+        |
|                                                |
|  Recent                                        |  <- recent header
|  05-19  08:12  Mon  ↑  Board  [sun]   28°      |
|  05-18  18:34  Sun  ↓  Alight [cld]   24°      |
|  05-18  08:09  Sun  ↑  Board  [sun]   27°      |
|  05-17  18:41  Sat  ↓  Alight [rain]  21°      |
|  05-17  08:15  Sat  ↑  Board  [rain]  22°      |
|                                                |
+------------------------------------------------+
| [home]      [list]            [bar-chart]      |  <- bottom nav
+------------------------------------------------+
       (above home indicator via safe-area)
```

#### 3.1.2 元素清單

| 元素                  | 角色                       | 視覺規格                                                                                  |
| --------------------- | -------------------------- | ----------------------------------------------------------------------------------------- |
| header                | 應用 chrome                | 高 48，背景 `--bg`，下邊 1px `--border`，左 "Commute" `--fs-lg`，右 gear icon 44×44 hit。 |
| status strip          | 持久顯示上次紀錄結果       | 卡片 `--bg-elevated`，`--r-lg`，`--shadow-1`，padding 16。三行：時間+事件、ETA、weather。 |
| status strip · 時間   | hero info                  | mono `--fs-xl` 500，左對齊。                                                              |
| status strip · 事件   | hero info                  | prose `--fs-lg` 500，緊跟時間後空 2ch。                                                   |
| status strip · Undo   | 撤銷                       | 右上 pill `--r-full` 邊框 1px `--border-strong`，文字 mono `--fs-sm`，倒數動態。          |
| status strip · ETA    | 預測                       | mono `--fs-xl` 500 + 小字 `· n=42 · ±3min`（`--fg-muted` `--fs-sm`）。                    |
| status strip · 天氣   | 上下文                     | icon 20px + mono `--fs-base` 溫度。圖示色 `--fg-muted`。                                  |
| 四大按鈕              | 主要動作                   | 2×2 grid，間距 12，每顆 `--r-xl`，`--bg-elevated`，`--shadow-1`。文字 `--fs-lg` 600 置中。 |
| recent header         | section 標題               | `--fs-sm` 500 `--fg-muted`，大寫，下方 1px `--border`。                                   |
| recent row            | 列表項                     | 高 36，欄位以 grid 對齊（見下）。mono 用於日期/時間/溫度。tap → 跳 log.html 並 scroll 到該列。|
| bottom nav            | 全站導覽                   | sticky bottom，3 個 icon 等寬，當前頁 `--accent` 描邊，其餘 `--fg-muted`。                |

Recent row 的 grid template：`6ch 6ch 4ch 2ch 8ch 4ch 5ch` 對應 date / time / weekday / dir-arrow / event / weather-icon / temp。

#### 3.1.3 互動狀態

四大按鈕：

| 狀態      | 視覺                                                                                  |
| --------- | ------------------------------------------------------------------------------------- |
| idle      | bg `--bg-elevated`，text `--fg`，shadow-1                                              |
| hover     | bg `--surface-hover`（桌面）                                                          |
| pressed   | bg `--surface-press`，`transform: scale(0.97)`，shadow 移除，120ms                     |
| loading   | text 替換為 spinner（inline SVG 旋轉 1s linear infinite），button disabled              |
| success   | 短暫（200ms）邊框由 `--success` 描出，回到 idle；同時 status strip 接管後續顯示       |
| error     | 邊框 `--danger` 描出 400ms，shake 動畫（translateX -2/+2 px 三次，120ms 總長）        |
| disabled  | opacity 0.4，no pointer                                                               |

Status strip Undo pill：

| 狀態      | 視覺                                                              |
| --------- | ----------------------------------------------------------------- |
| idle      | 邊框 `--border-strong`，文字 `--fg`，倒數 mono                    |
| pressed   | bg `--surface-press`                                              |
| loading   | 文字換 spinner，disabled                                          |
| expired   | opacity 從 1 漸到 0（200ms），然後 `display:none`                 |

#### 3.1.4 動畫

- 按下按鈕：`scale(0.97)` + bg 切換，120ms `--motion-fast`。放開回彈 200ms。
- 紀錄成功後 status strip 內容更新：舊內容 opacity 1→0（120ms），新內容由 translateY(-4px) + opacity 0 → translateY(0) + opacity 1，320ms `--motion-slow`（spring）。
- Recent 列表追加新 row：新 row 從 height 0 + opacity 0 → 36px + opacity 1，200ms `--motion-base`。
- Undo 倒數：純文字數字遞減，不做秒針旋轉動畫（省效能、不分心）。

---

### 3.2 `log.html` — 紀錄列表

#### 3.2.1 Wireframe

```
+------------------------------------------------+
| < Log                                          |  <- header w/ back
+------------------------------------------------+
| [All][Board][Alight] [↑Work][↓Home] [sun][rain]|  <- filter chips (scrollable)
+------------------------------------------------+
| Date   Time   Wk Dir  Event   Wx    Temp  Note |  <- col header
| 05-19  08:12  Mon ↑   Board   sun   28°   —    |
| 05-18  18:34  Sun ↓   Alight  cld   24°   late |
| 05-18  08:09  Sun ↑   Board   sun   27°   —    |
| 05-17  18:41  Sat ↓   Alight  rain  21°   wet… |
| 05-17  08:15  Sat ↑   Board   rain  22°   —    |
|                                                |
| ┌── expanded row ──────────────────────────┐   |
| │ 05-16  08:11  Fri ↑  Board  sun  27°    │   |
| │                                          │   |
| │ Note  [missed first stop, ran .........] │   |  <- inline textarea
| │                                          │   |
| │                  [Save]  [Delete]        │   |
| └──────────────────────────────────────────┘   |
|                                                |
| ... 45 more rows ...                           |
|                                                |
+------------------------------------------------+
| [home]      [list]*           [bar-chart]      |
+------------------------------------------------+
```

#### 3.2.2 元素清單

| 元素           | 規格                                                                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| back chevron   | 左上 chevron-right 翻轉 180°，跳回 `/index.html`。hit 44×44。                                                                                          |
| filter chips   | 橫向 `overflow-x: auto`，無 scrollbar 視覺（`scrollbar-width: none`）。chip 高 36 + hit 44，`--r-full`，未選 `--border` 邊框，選中 `--accent` 實心。   |
| chip groups    | 由空隔分組：`Event(All/Board/Alight)` / `Direction(↑Work/↓Home)` / `Weather(sun/cloud/rain/wind/—)`。組內單選，組間並存（AND 邏輯）。                  |
| col header     | sticky top，高 32，`--fg-muted` `--fs-xs` 大寫，下邊 1px `--border-strong`。grid template 與 row 一致。                                                |
| row            | 高 40，grid `6ch 6ch 4ch 2ch 8ch 4ch 5ch 1fr`。tap 任意處 → 展開。mono 用於 date/time/temp。direction arrow `--accent` 色。                            |
| row hover/active | bg `--surface-hover`；active row（展開中）bg `--accent` × 8% opacity overlay + 左邊 2px `--accent` accent bar。                                      |
| expanded panel | row 下方插入 panel，高度 auto，padding 16，bg `--bg-elevated`，`--r-md`，內含 note textarea + Save / Delete。`--shadow-2`。                            |
| note textarea  | 全寬，min-height 60，mono `--fs-sm`，邊框 1px `--border-strong`，focus 換 2px `--accent` 並去掉 default outline。                                      |
| Save button    | accent 實心，高 36，`--r-md`，`--accent-fg` 文字。                                                                                                     |
| Delete button  | 邊框版 danger，高 36，`--r-md`，文字 `--danger`，hover bg `--danger-bg`。確認 = 二次點擊（按下第一次後 3 秒內變紅實心並顯示「Confirm」）。            |
| empty state    | 居中圖示 list（48px，`--fg-subtle`）+ 文字「尚無紀錄。」+ link 回首頁的按鈕。                                                                          |

#### 3.2.3 互動狀態

Row：

- idle：透明背景
- hover：`--surface-hover`
- pressed：`--surface-press`
- expanded：`--accent-bg-soft`（accent 8%）+ 左 accent bar 2px
- loading（saving）：textarea disabled、Save 顯示 spinner

Filter chip：

- unselected：邊框 `--border`，文字 `--fg`
- selected：bg `--accent`、文字 `--accent-fg`、無邊框
- pressed：scale 0.97
- count badge（可選）：chip 右側 mono `--fs-xs` 顯示符合此 filter 的筆數，`--fg-muted`

Delete：

- 第一次點：bg 從 transparent 過渡到 `--danger-bg`、文字「Confirm delete?」、200ms
- 3 秒未確認：恢復為 idle
- 第二次點：spinner，刪除後 row collapse + 上移補位（200ms）

#### 3.2.4 動畫

- Row 展開：panel `max-height` 0 → 220px、opacity 0 → 1，200ms `--motion-base`。同時 chevron-right 旋轉 90° → chevron-down 效果。
- Row 收合：反向，160ms。
- Filter chip 切換：bg 顏色 transition 120ms。
- Row 刪除：行 height 40 → 0、opacity 1 → 0，200ms，並 `--motion-fast` 對下方 row 做 translateY 補位。

---

### 3.3 `charts.html` — 四張圖

#### 3.3.1 Wireframe（mobile，stacked）

```
+------------------------------------------------+
| < Charts                                       |
+------------------------------------------------+
| 247    63        14.2 min     2                |  <- aggregate row
| events paired    7d avg       missing alight   |
+------------------------------------------------+
|                                                |
| Duration Trend            n=63                 |
| +------------------------------------------+   |
| |                                          |   |
| |      .   .                               |   |
| |   .    .   .   .                         |   |
| | .            .   .  .   .                |   |
| |                       .    .             |   |
| +------------------------------------------+   |
| Apr            May                             |
|                                                |
| Boarding Time Scatter     n=124                |
| +------------------------------------------+   |
| | 08:30 - -  .  . .                        |   |
| | 08:15 - - .  ...                         |   |
| | 08:00 - - .                              |   |
| +------------------------------------------+   |
| Mon Tue Wed Thu Fri                            |
|                                                |
| Duration by Weather       n=63                 |
| +------------------------------------------+   |
| | sun   ████░░  17min                      |   |
| | cloud ███░░░  15min                      |   |
| | rain  ██████  22min                      |   |
| +------------------------------------------+   |
|                                                |
| Duration by Weekday       n=63                 |
| +------------------------------------------+   |
| | Mon ████░  16   Fri █████  19            |   |
| | Tue ███░░  14                            |   |
| | ...                                      |   |
| +------------------------------------------+   |
|                                                |
+------------------------------------------------+
| [home]      [list]            [bar-chart]*     |
+------------------------------------------------+
```

#### 3.3.2 Wireframe（desktop ≥1024，2×2）

```
+----------------------------------------------------------------+
| Charts                                                          |
+----------------------------------------------------------------+
| 247 events  | 63 paired | 14.2 min 7d avg | 2 missing alight    |
+----------------------------------------------------------------+
| +------------------------+  +------------------------+          |
| | Duration Trend  n=63   |  | Boarding Scatter n=124 |          |
| |                        |  |                        |          |
| |   (chart)              |  |   (chart)              |          |
| |                        |  |                        |          |
| +------------------------+  +------------------------+          |
| +------------------------+  +------------------------+          |
| | By Weather  n=63       |  | By Weekday  n=63       |          |
| |                        |  |                        |          |
| |   (chart)              |  |   (chart)              |          |
| |                        |  |                        |          |
| +------------------------+  +------------------------+          |
+----------------------------------------------------------------+
```

#### 3.3.3 元素清單

| 元素                | 規格                                                                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| aggregate row       | 4 欄等寬 grid，每欄 hero 數字 `--fs-2xl` mono 500、下方 label `--fs-xs` `--fg-muted` 大寫。mobile 上 2×2，desktop 上 4×1。                     |
| chart section       | 每張圖一個 `<section>`，padding 16，`--bg-elevated`，`--r-lg`，`--shadow-1`，下方間距 `--sp-6`。                                               |
| chart title         | `--fs-lg` 500，左對齊。右側 `n=63` mono `--fs-sm` `--fg-muted`。                                                                              |
| canvas              | `aspect-ratio: 16/10` (mobile)、`4/3` (desktop)，width 100%。                                                                                  |
| legend              | 圖下方 8px，row of dot + label，`--fs-sm`。                                                                                                   |
| chart icon          | 標題左側 bar-chart icon 16px，`--fg-muted`。                                                                                                  |

Chart.js 客製：

- font：強制走 mono stack。
- color：tick 與 grid 用 `--border`，label 用 `--fg-muted`，資料線用 `--accent`，p90 用 `--fg-muted`。
- tooltip：自訂 `external` callback 套上 `--bg-elevated` 背景、`--r-md`、`--shadow-2`、mono `--fs-sm`。
- responsive：`maintainAspectRatio: false`，外層 div 控制比例。
- 顏色透過 JS 讀取 computed `--accent` 變數（`getComputedStyle(document.documentElement).getPropertyValue('--accent')`），所以暗色模式切換時須觸發 chart.update()。

#### 3.3.4 互動狀態

- 載入中：canvas 區位置顯示 skeleton（見 3.5.4），aggregate row 4 個方塊用 shimmer。
- 點 chart 任一 data point：顯示自訂 tooltip（Chart.js 內建），不導向其他頁。
- 桌面 hover：data point 半徑放大 2px。
- 行動裝置：tap 出現 tooltip，3 秒後消失。

#### 3.3.5 動畫

- 載入完成後 chart 由 Chart.js 預設 animation 進入（700ms easeOutQuart），但若 `prefers-reduced-motion` 為 reduce 則禁用。
- aggregate 數字從 0 cascade 上跳到目標值，400ms `--motion-base`，每欄錯開 60ms。

---

### 3.4 `unlock.html`

#### 3.4.1 Wireframe

```
+------------------------------------------------+
|                                                |
|                                                |
|                                                |
|             Commute                            |  <- centered
|             Enter secret to unlock             |
|                                                |
|      +------------------------------+          |
|      | ●●●●●●●●●●●●●●●●●●●●●●●●●●  |          |  <- password input
|      +------------------------------+          |
|                                                |
|      +------------------------------+          |
|      |            Unlock            |          |  <- primary button
|      +------------------------------+          |
|                                                |
|             [error message slot]               |
|                                                |
|                                                |
+------------------------------------------------+
```

無 nav、無 header gear、無 footer。

#### 3.4.2 元素清單

| 元素            | 規格                                                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 容器            | `min-height: 100dvh`、flex column 居中、max-width 360。                                                                    |
| 標題            | "Commute" `--fs-2xl` 500，置中。                                                                                            |
| 副標            | "Enter secret to unlock" `--fs-base` `--fg-muted`，置中，距標題 `--sp-2`，距 input `--sp-6`。                              |
| input           | type password，全寬，高 48，`--r-md`，邊框 1px `--border-strong`，focus 改 2px `--accent`。`autocomplete="current-password"`。 |
| Unlock button   | 全寬，高 48，accent 實心，`--r-md`，`--fs-lg` 500。                                                                        |
| error slot      | 高度預留 24，文字 `--danger` `--fs-sm` 置中。空時保持空間（不抖動）。                                                       |

#### 3.4.3 互動狀態

- input idle / focus / invalid：focus ring 2px `--accent`；invalid 時邊框 `--danger`、shake 200ms。
- button：idle → pressed（scale 0.97）→ loading（spinner 取代文字）→ success（短綠閃 200ms 後 redirect 到 `/index.html`）。
- error：error slot 顯示「Incorrect secret.」，shake，input 清空並 refocus。

#### 3.4.4 動畫

- 進場：容器 opacity 0 → 1、translateY 8 → 0，280ms `--motion-base`。
- 成功 redirect 前：容器 opacity 1 → 0、translateY 0 → -4，200ms，再 `location.replace`。

---

### 3.5 PWA chrome

#### 3.5.1 manifest.webmanifest

- `name`: "Commute"
- `short_name`: "Commute"
- `display`: "standalone"
- `orientation`: "portrait"
- `start_url`: "/index.html"
- `scope`: "/"
- `background_color`: `#09090B`（dark mode 為主，避免暗色啟動時白閃）
- `theme_color`: `#18181B`
- `lang`: "zh-Hant"

#### 3.5.2 iOS meta（head 內）

- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` — 內容延伸到 status bar 後面，由 safe-area 處理。
- `<meta name="theme-color" content="#FAFAF9" media="(prefers-color-scheme: light)">`
- `<meta name="theme-color" content="#09090B" media="(prefers-color-scheme: dark)">`
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` — `viewport-fit=cover` 是 safe-area 生效的前提。

#### 3.5.3 Icon 設計簡述

風格：**monochrome bus glyph on dark square**。

- 背景：實心 `#09090B`（與 splash 背景一致）。
- 圖案：置中的公車側視 glyph，由 1.5px stroke 線條構成（縮圖時為粗實線）：車身圓角矩形、兩個圓窗、兩個輪、頂部一道小框（路線牌）。stroke 與 fill 皆 amber `#FBBF24`，僅輪轂留鏤空。
- 安全區：圖案佔畫布 60%，四周 20% 留白以利 iOS 自動圓角遮罩。
- 無文字、無漸層、無陰影。

所需檔案大小（皆 PNG，置於 `/icons/`）：

- `icon-180.png`（180×180，Apple touch icon）
- `icon-192.png`（192×192，manifest standard）
- `icon-512.png`（512×512，manifest large、splash 基底）
- `icon-maskable-512.png`（512×512，圖案縮至 70% 中央以符合 maskable safe zone）
- `favicon-32.png`（瀏覽器分頁用，雖然主要走 PWA）

manifest 中 `icons` 陣列須對前四者皆列出，`purpose` 為 `any maskable` 或分別宣告。

#### 3.5.4 Loading skeleton

當 `stats` 或 `recent` RPC 在飛行中：

- 對應區塊顯示與最終佈局**相同骨架**的灰塊。
- 灰塊色：`--surface-hover`，圓角 `--r-md`，高度與最終元素一致。
- shimmer：`background: linear-gradient(90deg, --surface-hover, --surface-press, --surface-hover)` 寬 200%，`background-position` 從 200% 0 → -200% 0 動畫 1.4s linear infinite。
- 至少顯示 200ms，避免「閃」一下（用 setTimeout 延遲解除）。

具體位置：

- index：status strip 區域骨架（高 88）、recent 區域 5 個 row 骨架。
- log：sticky col header 立即顯示，下方 8 個 row 骨架。
- charts：aggregate row 4 個方塊、每個 chart 區域 1 個大方塊。

---

## 4. Implementation Notes

### 4.1 CSS 檔案組織

採 **1 個 global + 3 個 page-specific** 的折衷：

- `/css/tokens.css`：CSS custom properties（light + dark + media query 切換）。約 80 行。
- `/css/base.css`：reset、typography 基底、`<body>` layout、共用 utility class（`.mono`、`.muted`、`.sr-only`）、bottom nav、header chrome、skeleton shimmer。約 250 行。
- `/css/index.css`：四大按鈕 grid、status strip、recent list row。約 180 行。
- `/css/log.css`：filter chips scroller、表格 grid、展開 panel、delete confirm。約 200 行。
- `/css/charts.css`：aggregate row、chart section card、canvas wrapper aspect-ratio。約 120 行。
- `/css/unlock.css`：居中容器、input + button。約 60 行。

`tokens.css` 與 `base.css` 在每頁都載入；page-specific 只在對應頁載入。`unlock.html` 不載入 nav 相關樣式以維持精簡。

**Critical CSS inline**：每頁 `<head>` 直接 inline 包含「tokens + 該頁首屏排版」的小片段（< 3KB），其後再 `<link rel="stylesheet">` 載入完整檔做漸進增強。實作上可在開發時手動維護 inline 段（無 build step），定期 diff 確保不漂移。

### 4.2 Browser support 矩陣

| Browser                  | 版本    | 支援程度                          |
| ------------------------ | ------- | --------------------------------- |
| iOS Safari (PWA)         | 16.4+   | 主要目標，全功能                   |
| iOS Safari (PWA)         | 15.x    | 全功能，僅 `aspect-ratio` 走 fallback |
| macOS Safari             | 16+     | 全功能                            |
| Chrome / Edge desktop    | 110+    | 全功能                            |
| Firefox                  | 115+    | 全功能                            |
| Android Chrome           | 110+    | 支援但非設計目標                  |

依賴的 CSS 特性與 fallback：

- `env(safe-area-inset-*)`：iOS 11+ 已支援。
- `dvh` 單位：iOS 15.4+，舊版降級為 `vh`（用 `@supports` 包）。
- `:has()`：避免使用（iOS 15 以下不支援）。
- `aspect-ratio`：iOS 15+，舊版降級為 `padding-bottom` 技巧。
- `color-mix()`：避免，accent 透明變體用預先定義的 token（如 `--accent-bg-soft`）。

### 4.3 與 Tailwind / 框架 的取捨

**Tailwind 是否會「好 10 倍」？** 誠實說：**不會**。理由：

- 本專案規模僅 4 頁、約 800 行 CSS，token 數有限，hand-rolled CSS 維護成本可接受。
- Tailwind 需要 build step（JIT），與「No build step」硬限制衝突。CDN 版（Play CDN）足夠 prototype 但會在每頁多 100KB+ JS 解析，違反 cold-start 目標。
- 自訂 token 與 `env()` safe-area 互動，Tailwind 反而要寫一堆 `[env(...)]` arbitrary values，可讀性沒比較好。
- chart canvas、PWA splash、inline SVG icon 都不是 Tailwind 強項。

**會失去什麼**（誠實列）：

- 沒有「class 即文件」的可瀏覽性。新成員（雖然此產品只有一個 owner）讀 CSS 要打開檔案。
- 設計變更要修兩處（HTML 結構 + CSS 規則），而非 Tailwind 的單點。
- responsive variants 要自己寫 media query。

**取捨判斷**：以「單人、低變動、強調冷啟動」的本產品，vanilla CSS 勝出。但若未來 surface 數 > 8 或新增多人協作，建議重新評估（可遷移到 Astro + Tailwind，不破壞 PWA 架構）。

### 4.4 暗色模式切換

預設跟隨 `prefers-color-scheme`，但提供手動覆寫：在 `unlock.html` 設定階段或 settings 內留一個 `localStorage.commute.theme = 'auto' | 'light' | 'dark'`，在 `<html>` 上設 `data-theme` 屬性，CSS 用 `:root[data-theme="dark"]` 與 `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` 雙重命中。

切換時：

- `<meta name="theme-color">` 透過 JS 動態切換對應 content。
- Chart.js 重新呼叫 `chart.update()` 讓內部色彩重新讀取 CSS variable。

### 4.5 JS 與 CSS 的銜接點（純規格描述）

- Status strip 內容由 JS 操作 DOM 寫入，但 CSS 已預先定義所有狀態 class（`.ss--idle` / `.ss--success` / `.ss--warning` / `.ss--no-prediction`）。JS 僅切 class，不直接寫 style。
- 倒數秒數透過 CSS custom property `--undo-remaining` 傳入，JS 每秒寫 `style.setProperty('--undo-remaining', 9)`，CSS 用 `::after { content: 'Undo (' counter(undo) ')' }` 或直接走 text node（後者較簡單，建議）。
- skeleton 顯示與隱藏走 `.is-loading` class，CSS 控制可見性與動畫。
- filter chip 選中狀態走 `aria-pressed="true"`，CSS 用 `[aria-pressed="true"]` selector 著色（同時保住無障礙語意）。

### 4.6 無障礙細項

- 四大按鈕：`<button>` 原生，`aria-label` 補上完整事件名稱（中文）。
- recent row 與 log row：用 `<button>` 或 `<a>` 包覆，確保鍵盤可達。
- focus ring：所有可互動元素 `:focus-visible` 顯示 2px `--accent` outline + 2px offset，不靠純色彩傳達狀態。
- weather icon：`<svg role="img" aria-label="sunny">`，無資料時 `aria-label="weather unavailable"`。
- 暗色模式對比度：上文表已驗證 AA 以上。
- 動畫：全面遵守 `prefers-reduced-motion`。

### 4.7 效能預算

- 每頁 HTML（含 inline critical CSS） < 8KB gzipped。
- 全站 CSS 總和 < 12KB gzipped。
- inline SVG icons 共 < 4KB。
- JS（不含 Chart.js）每頁 < 15KB。
- Chart.js 從 CDN，HTTP cache 跨頁共享，僅 charts.html 載入。

---

## 5. 後記：第一次使用者實測後，會重新檢視的五件事

1. **Undo 倒數的 10 秒是否夠**：實際下車後抬頭看手機到反應「我按錯了」可能落在 6–15 秒，若回饋顯示太多人在第 10–12 秒按下，延長到 15 秒並重新衡量視覺干擾。
2. **Status strip 的 ETA 信心區間呈現**：目前用 `±3min`，但若使用者常常忽略區間只看點估值並感到失準，會考慮改成只在誤差 > 5min 時才顯示警示色 + 加大字。
3. **四大按鈕排列**：上班/下班 × 上車/下車 的 2×2，但實務上「下班-下車」是頻率最高的（每天結尾），是否該放左下（拇指最佳位置）而非右下？需要看真實點擊熱區。
4. **暗色模式的 amber**：`#FBBF24` 在 OLED 全黑背景下偏「太亮」可能在夜間刺眼，會考慮降到 `#F59E0B` 或加 `prefers-contrast` 分支。
5. **Recent 列表 5 列是否夠**：若使用者一週只搭 5 趟，5 列剛好 = 一週快照；若搭 10 趟，5 列等於只看到兩天，可能要動態調整為「最近 3 天」而非「最近 5 筆」。
