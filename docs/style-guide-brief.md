# Commute — Style Guide Brief

> 把這份文件整份貼給 Claude，請它產出一張 **style guide 風格圖**（封面海報式、含 color swatch、typography、按鈕、status card、表格 row、chart 預覽）。
> 完整 spec 在 [`frontend-design.md`](./frontend-design.md)，本檔是為產圖而濃縮的版本。

> ⚠️ **已被取代（2026-05）。** 本檔描述的是舊的「Linear / SF-native、灰階克制、絕不引入 web font」方向。
> 現行的視覺系統是 **「Slow Town Station」riso/risograph 暖色紙票風格**（暖奶油紙、sun/clay/leaf 三色、四種指定 web 字體）。
> 完整規格見 [`design-system-slow-town-station.md`](./design-system-slow-town-station.md)，token 落地在 `public/css/tokens.css`。
> 下列兩點已**刻意推翻**：
> - **字型**：新系統需要四種 web font（DM Serif Display / Noto Serif TC / Caveat / JetBrains Mono，無替代）。
>   以 `display=swap` + `preconnect` 載入——首屏文字立即以系統 serif fallback 繪製（無 FOIT），字體下載完成後才置換，
>   因此「文字 < 200ms 可見」的目標仍成立，只是不再堅持「絕不引入 web font」。
> - **色票 / 美學**：amber 單 accent + 灰階 → 暖奶油紙 + sun/clay/leaf 三色 riso 疊印。
> 其餘排版克制、tabular 數字、密集表格列、border 主導等原則仍沿用。

---

## 1. 產品定位

**Commute** —— 個人通勤紀錄 PWA。

- **誰用**：一個人（owner = user），不需多帳號、不需 onboarding。
- **怎麼用**：iPhone 加到主畫面，每次上下車按一顆按鈕（共四種：上班·上車 / 上班·下車 / 下班·上車 / 下班·下車）。
- **它回給你什麼**：上次紀錄的時間 + 預測 ETA + 當時天氣，以及累積後的圖表（duration trend、boarding scatter、by weather、by weekday）。
- **使用情境**：站在公車站、車上、下車那一刻；單手、可能戴著手套或在搖晃。
- **產品姿態**：私人工具，不是社群、不是 SaaS。**克制、安靜、像一張車票**。

一句話定位：**A bus-ticket-feeling PWA — one tap to log, glance to see what's next.**

---

## 2. 氛圍 / 風格參考

**Minimal · Dense · Fast.** 三個字描述美學態度。

### 視覺靈感（給 Claude 視覺參考的混合配方）

| 靈感來源                       | 借走什麼                                                                 |
| ------------------------------ | ------------------------------------------------------------------------ |
| **Linear (linear.app)**        | 排版克制、灰階為主、accent 點到為止、Inter/SF 系統字、shadow 極淺。      |
| **1970s 公車時刻表**           | 等寬 tabular 數字感、表格列高緊湊、欄位對齊比裝飾重要。                  |
| **校車黃 / 站牌黃**            | accent 是 amber `#F59E0B`——交通語意，警示但不刺眼。                      |
| **Vercel / Stripe dashboard**  | 卡片 elevation 只有兩階、border 比 shadow 更主導、focus ring 是 accent。 |
| **iOS native (SF Pro)**        | ~~字型直接走系統 stack、不引入 web font~~（已被 Slow Town Station 取代，見頂部註記）。冷啟動「文字 < 200ms 可見」仍維持，改用 `display=swap` fallback。 |

### 反面參考（**不要**做的方向）

- ❌ Material Design 那種強 elevation + 鮮豔 ripple
- ❌ Neumorphism / glass / gradient mesh
- ❌ Hand-drawn / illustration-heavy
- ❌ 多 accent 色、彩虹 tag
- ❌ 大圖 hero / 行銷感 landing

---

## 3. 色票（Color Tokens）

### Light mode

```
背景        --bg              #FAFAF9   zinc-50 微暖
卡片        --bg-elevated     #FFFFFF
主文字      --fg              #18181B   zinc-900
次文字      --fg-muted        #71717A
極淡文字    --fg-subtle       #A1A1AA
Accent      --accent          #F59E0B   amber 500（主按鈕、focus、active）
Accent深    --accent-hover    #D97706
Accent上字  --accent-fg       #1C1917   accent 背景上用深色字
成功        --success         #16A34A
警告        --warning         #D97706
危險        --danger          #DC2626
邊線        --border          #E4E4E7
邊線粗      --border-strong   #D4D4D8
Surface hover   #F4F4F5
Surface press   #E4E4E7
```

### Dark mode

```
背景        --bg              #09090B   zinc-950（OLED 不全黑、避免刺眼）
卡片        --bg-elevated     #18181B
主文字      --fg              #FAFAF9
次文字      --fg-muted        #A1A1AA
Accent      --accent          #FBBF24   amber 400（dark 略提亮）
成功        --success         #22C55E
警告        --warning         #FBBF24
危險        --danger          #F87171
邊線        --border          #27272A
邊線粗      --border-strong   #3F3F46
```

對比驗證：`--fg` on `--bg` ≥ 7:1（AAA）；`--fg-muted` on `--bg` ≥ 4.5:1（AA）。

---

## 4. 字型（Typography）

> ⚠️ **已被取代**：以下「絕不引入 web font」的兩套系統字 stack 是舊方向。現行 Slow Town Station 使用四種指定 web font（見頂部註記與 `tokens.css`）。

舊的兩套字 stack（已停用）：

- **Prose**（介面文字、按鈕標籤、節標題）
  `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", ui-sans-serif, system-ui, sans-serif`
- **Mono**（時間、ETA、分鐘數、表格數字、溫度）
  `ui-monospace, "SF Mono", "Menlo", "Cascadia Mono", "Roboto Mono", monospace`

**規則**：任何「數字 + 單位」一律走 mono；按鈕文字、章節標題走 prose。
`font-feature-settings: "tnum" 1`——mono 強制 tabular numbers，欄寬一致。

### Size scale

| Token       | Size  | 用途                                    |
| ----------- | ----- | --------------------------------------- |
| `--fs-xs`   | 11px  | weekday、micro caption                  |
| `--fs-sm`   | 13px  | 表格內文、註解                          |
| `--fs-base` | 15px  | 一般 UI 文字                            |
| `--fs-lg`   | 18px  | 按鈕主標、section 小標                  |
| `--fs-xl`   | 22px  | 頁標、status strip 時間/ETA             |
| `--fs-2xl`  | 28px  | charts 頁的 hero 數字                   |

字重：400 / 500 / 600（不用 700，避免 fallback 不一致）。

---

## 5. 形狀 / 間距 / 陰影

- **Spacing**（4px base）：4, 8, 12, 16, 24, 32, 48
- **Radius**：4 (chip) / 8 (input, 小按鈕) / 12 (卡片) / 16 (**四大按鈕**) / 9999 (pill)
- **Shadow**：只有兩階。`--shadow-1` 卡片預設，極淺；`--shadow-2` 展開/按下時。**不做炫技 elevation。**
- **Motion**：120ms 按下反饋、200ms row 展開、320ms spring 用於新 log 進入 status strip。`prefers-reduced-motion` 全面降為 0ms。

---

## 6. 關鍵元件視覺（Style Guide 圖請包含這些）

### 6.1 四大按鈕（hero element）

- 2×2 grid，間距 12，每顆 `--r-xl`（16px radius），`--bg-elevated`，`--shadow-1`
- 文字 `--fs-lg` 600，置中，中文：「上班 · 上車」「上班 · 下車」「下班 · 上車」「下班 · 下車」
- 視覺尺寸 ~170×96（iPhone 393 寬下兩欄滿版）
- pressed：`scale(0.97)` + `--surface-press`，shadow 移除

### 6.2 Status strip（持久卡片，不是 toast）

```
┌────────────────────────────────────────────┐
│ 08:12  上班·上車              Undo (8)     │   ← time + event + undo pill
│ ETA  08:47  · n=42 · ±3min                 │   ← prediction
│ [☀]  28°                                   │   ← weather
└────────────────────────────────────────────┘
```

- `--bg-elevated`、`--r-lg`、`--shadow-1`、padding 16
- 時間 mono `--fs-xl` 500；事件 prose `--fs-lg` 500
- ETA 用 mono；`n=42 · ±3min` 用 `--fg-muted` `--fs-sm`
- Undo 是 pill（`--r-full`），邊框 1px `--border-strong`，倒數 mono

### 6.3 Recent / Log row（表格列）

```
05-19  08:12  Mon  ↑  Board   ☀   28°
05-18  18:34  Sun  ↓  Alight  ☁   24°
05-18  08:09  Sun  ↑  Board   ☀   27°
```

- 高 36–40，grid 對齊欄位
- 日期 / 時間 / 溫度 走 mono；direction arrow 走 `--accent` 色
- 展開時左邊出 2px `--accent` accent bar + 微微 accent-tint 背景

### 6.4 Filter chips（log 頁）

- `--r-full` pill，高 36 + hit 44
- 未選：1px `--border` 邊框、文字 `--fg`
- 選中：`--accent` 實心、`--accent-fg` 文字、無邊框
- 橫向 scroll，無 scrollbar

### 6.5 Charts

- 卡片化的 chart section（`--bg-elevated` + `--r-lg`）
- 線/點 用 `--accent`、grid `--border`、label `--fg-muted`
- Aggregate 數字 `--fs-2xl` mono 500
- 四張圖：duration trend（散點 + 移動平均線）/ boarding scatter / by weather bar / by weekday bar

### 6.6 Iconography

全部 **inline SVG**，stroke-based，`stroke-width: 1.5`，尺寸 16 或 20：
gear · chevron-right/down · trash · undo · bar-chart · list · home · sun · cloud · cloud-rain · wind · help-circle

**不**用 icon font、**不**用 filled icon、**不**用彩色 icon。

### 6.7 PWA App icon

- 背景 `#09090B` 實心方塊
- amber `#FBBF24` 1.5px stroke 的公車側視 glyph（圓角矩形車身 + 兩圓窗 + 兩輪 + 頂部路線牌）
- 圖案佔畫布 60%，無文字、無漸層、無陰影

---

## 7. 給 Claude 的產圖指令（範本）

```
請依下列規範產出一張 Commute PWA 的 style guide 海報（直式 1200×1800 或方形 1600×1600）。

版面分區：
1. 標頭：產品名 "Commute" + 一句 tagline「A bus-ticket-feeling PWA」
2. 色票區：light mode 與 dark mode 並排，每色一個 swatch + token 名 + hex
3. 字型區：prose / mono 兩個 stack 各示範一行；size scale 6 階梯
4. 元件區：四大按鈕（2×2）、status strip 卡片、recent row 表格、filter chips、一張縮圖 chart
5. 圖示區：12 個 stroke-icon 排成一列
6. App icon 預覽：amber 公車 glyph on dark square

風格指示：minimal、克制、灰階為主 + amber accent 點到為止、卡片陰影極淺、tabular mono 數字、無漸層無玻璃無 3D。
靈感參考：Linear × 1970 年代公車時刻表。
```

---

## 8. 一句話總結（給最短 prompt 用）

> Minimal personal PWA for logging bus commutes. Slate/zinc neutral + amber `#F59E0B` accent. SF Pro prose + monospace numbers. Two-elevation cards, 16px-radius hero buttons in 2×2 grid, persistent status strip with ETA, dense tabular log rows. Inspired by Linear's restraint and 1970s bus timetable typography. Bus-ticket feeling, never marketing-shiny.
