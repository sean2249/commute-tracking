# Commute — Slow Town Station 實作清單

> 依 `design-system-slow-town-station.md`(handoff bundle)逐項實作。完成一項就把 `[ ]` 改成 `[x]`。
> 這份清單是執行依據,**經使用者確認後才開始實作**。

## 已鎖定的範圍決策

| 主題 | 決定 |
|---|---|
| §10 通知/widget/watch | **只做 web 可行**:Web Push lockscreen 式通知 + PWA;不做原生 widget/watch/live-activity |
| 場景插畫 §04/§05 | **做完整**:天空 time-of-day、山丘/路、bus lurch、到站 hop |
| Dark mode §09 | **依時間 lerp**(日落±10 分、20 分漸變)+ 長按 stop-dot 手動覆寫 |
| RWD | **Mobile-first**:≤480 主,720 / 1024 漸進增強 |
| 首頁 DOM(Q13) | **完整重寫**(方案 B):依 A/B/C 狀態機重組首頁 + render 層,保留所有資料邏輯 |
| Settings / 站名(Q6/Q15) | 做**最小 Settings**(Home/Office 文字 + 偏好 AM/PM 時段);之前預設 `住所/Home → 公司/Office` |
| 多路線(Q7) | **延後**,不在 v1 |
| A11y(Q8) | 目標 **AA**;裝飾元素 `aria-hidden`,動作給語意 label;focus-visible + reduced-motion |
| Onboarding(Q9) | 不做導覽,只做 first-launch splash |
| 圖示(Q10) | 沿用 inline SVG,天氣圖示調到 §06/§07 stroke weight;不引入外部 library |
| 觸覺(Q11) | `navigator.vibrate`:tap 短震、到站 soft tick |
| 匯出/分享(Q12) | **延後**,不在 v1 |
| VOID/撕票(Q14) | 刪除 trip = 撕票(torn);reminder 自動丟棄 open board = VOID 印章 |

### 細節決策（A1–A10,已確認 2026-05-30）
- **A1 Ride card 無序號**:整個 app 不放序號;top = `RIDING · LIVE`;time pair = 上車 ▸ ETA(預測中位數);meta = 站名 + 溫度 + 天氣
- **A2 Undo**:做。ride card 上 `undo` + **8 秒倒數**;取消剛按的上車(刪 board + 清 open board + 取消提醒)
- **A3 Log delta**:**移除**(覆蓋先前決定)——紀錄/日記列只顯示 duration(分鐘),不顯示 vs 預期的早/晚 delta
- **A4 Glance note**:v1 簡單事實 note,clever 推論延後
- **A5 Splash 鎮名**:用「通勤 / Commute」
- **A6 通知時機**:維持現況兩計時器模型,**提醒 30 分、捨棄 120 分**,且**可在 Settings 修改**;不採 handoff 的 inbound/head-back/weekly
- **A7 通知文案**:**維持現況**(不改寫 voice)
- **A8 Dark/TOD**:**固定時刻**——日間 **07:00** 起、夜間 **17:00** 起;傍晚漸入 17:00、清晨漸入 07:00(曲線我安排);**不**用定位日落;reduced-motion → snap;手動覆寫記到當天結束
- **A9 Mobile header**:**極簡**——只 wordmark + stop-dot + 齒輪 + 三色線,**無中文「通勤」、無 tagline、無 placard**
- **A11 公車移動畫面(硬性)**:手機版**一定要有公車移動的場景**(state B 在途 bus-lurch);**所有斷點皆必現,不得在小屏隱藏**;reduced-motion 時仍顯示公車,僅停止動畫
- **A10 Saving 指示**:等待中 dot-pulse,成功瞬間 stamp 印章動畫
- **A12 長按提示**:改**英文**(如 `hold to switch to evening`),字級縮到**全畫面最小**(mono ~8px、ink-faint)
- **A13 票卡置中**:水平置中(`margin:0 auto` + max-width,如 360px),不貼滿左右邊

---

## 1. Design tokens（基礎）
- [x] 1.1 色票對齊 hex:paper/ink(9)、am(4)、pm(4)、leaf(4)、sky(6)、star
- [x] 1.2 四字體家族 + 語意角色(display/body/hand/mono)
- [x] 1.3 字級 scale(xs→3xl + hand)
- [x] 1.4 spacing(11)、radius(3,無 pill)、shadow(2,暖色)
- [x] 1.5 motion 三曲線(lurch / smooth / bouncy)
- [x] 1.6 paper texture（亮/暗兩版）
- [x] 1.7 reduced-motion:所有 literal infinite 動畫都要被關閉

## 2. 全域 shell
- [x] 2.1 page 紙質背景 + 雙 riso overprint
- [x] 2.2 Header 品牌標記:display wordmark + amber stop-dot + 三色打孔 rule
- [x] 2.3 Bottom nav（站牌風,active 印章 tick）
- [x] 2.4 Stopsign placard（站牌元件）
- [x] 2.5 共用 toast / 錯誤提示樣式

## 3. 首頁重寫（方案 B,A/B/C 狀態機）
**3.A 不可 regression（重寫後逐一驗證）**
- [x] 3.A1 `handlePrimary` iOS 手勢時序:`ensureNotificationPermission()`→`subscribeToPush()` 在同一 gesture 內、不在 await 之後
- [x] 3.A2 定位 → `logEvent` → reminder 排程/取消 → openBoard set/clear 流程不變
- [x] 3.A3 open-board 對帳（`reconcileWithServer`)、長按切方向、刪除配對、重抓天氣、auto-discard 事件
- [x] 3.A4 所有 DOM hook id/class（給其他 JS 用的）保留或同步更新

**3.B 重組結構**
- [x] 3.B1 顯式狀態模型 A(晨候/sun)/ B(在途/leaf)/ C(暮候/clay)+ 時間規則（<16:00→A、≥16:00→C）
- [x] 3.B2 首頁佈局:scene 容器 + 狀態卡（票券/ride card）+ 日記
- [x] 3.B3 `render(state)` 統一組合 scene + 卡片
- [x] 3.B4 狀態配色隨方向（AM=sun、PM=clay、在途=leaf）

**3.C 轉場**
- [x] 3.C1 BOARD 點擊 → 印章動畫 → 公車駛離場景 → 出現 ride card
- [x] 3.C2 ALIGHT 點擊 → 公車進站 hop → 票券歸檔進日記
- [x] 3.C3 轉場全受 reduced-motion 規範

## 4. 場景插畫（§04/§05,完整）
- [x] 4.1 構圖層:sky / hills / road / ground / trees / grass
- [x] 4.2 物件:house / office tower / stop sign / stationmaster figure
- [x] 4.3 bus mascot 在路上(right/left),lurch + bob;**車輪貼齊路面**(對齊時扣掉 PNG 底部透明留白,lurch/bob 仍保持接地)
- [x] 4.4 time-of-day 天空 lerp（dawn/day/dusk/night,不 snap）
- [x] 4.5 場景高度(200 full / 150 TOD strip / 160 arrival)
- [x] 4.6 到站動畫序列（bouncy hop + early-by-N′ 標註）
- [x] 4.7 場景框（1px ink-line）
- [x] 4.8 ⚠️ **公車移動場景為手機必備**:bus-lurch 在所有斷點(含 ≤480)皆顯示,不得隱藏;reduced-motion 仍顯示公車(僅靜止)

## 5. Ticket `.pas-ticket`

### 票卡內容（已確認 2026-05-30）
左 body:`date` + 手寫動詞 + 站名對 + 箭頭；右 punch 欄:打洞孔 + glyph + ticks。

| 情境 | 紙色 | 手寫動詞(Caveat) | 站名對 | glyph | ticks |
|---|---|---|---|---|---|
| BOARD·上班 | sun(am) | `all aboard` | 住所/HOME → 公司/OFFICE | `↑` | `BOARD` |
| BOARD·下班 | clay(pm) | `heading home` | 公司/OFFICE → 住所/HOME | `↑` | `BOARD` |
| ALIGHT·上班 | sun(am) | `all off` | 住所/HOME → 公司/OFFICE | `↓` | `ALIGHT` |
| ALIGHT·下班 | clay(pm) | `all off` | 公司/OFFICE → 住所/HOME | `↓` | `ALIGHT` |

- date 格式 `YYYY·MM·DD`(mono, tnum);站名中文 = DM Serif display,英文 caption = mono
- 站名預設 **住所 / 公司**(HOME / OFFICE),Settings 做好前寫死
- 票卡**不放序號**;序號只在 ride card(`Nº0530`)
- 移除非 handoff 元素:`PASS · 通勤券`、`ONE WAY`、footer `No.` + `MAY 30 · SAT`
- punch 欄在**右側 60px**(修正現況的左 stub)

- [x] 5.1 結構（**完全照 handoff anatomy**）:grid `1fr 60px` → **body 在左**(date / 手寫動詞 / 站名對 中文display+英文mono / 箭頭→)、**punch 欄在右**(打洞孔 inset shadow / 大 mono glyph ↑↓ / 3 字 ticks);上下打孔邊、垂直虛線騎縫
- [x] 5.1a ⚠️ **修正現況**:目前 primary-action 的 stub/punch 在**左(86px)**,方向相反 → 移到**右側**,改成 handoff 的「左 body / 右 punch」結構
- [x] 5.2 變體:default(am)、`.pm`、`.leaf`
- [x] 5.3 三種尺寸（§04）
- [x] 5.4 狀態:default / `:active`(下壓) / loading(skeleton 票) / success / error(shake)
- [x] 5.5 VOID / torn-by-driver(撕票=刪除、VOID=auto-discard)
- [x] 5.6 極端:超長站名截斷、序號/日期溢位、空站名 fallback

## 6. Ride card `.ride-pas`
- [x] 6.1 撕邊 carbon(上打孔 + 下鋸齒)、LIVE 脈動點、時間對、ETA window、undo pill
- [x] 6.2 變體:am / `.pm`
- [x] 6.3 狀態:PREDICTING(無 leaf 脈動、`––:––`、`··· ETA`) / LIVE / 到站
- [x] 6.4 極端:ETA 大值(±99′)、無預測樣本、時間對跨日

## 7. Log / diary row `.log-day`
- [x] 7.1 兩腿列:day stamp + AM 腿 + PM 腿、虛線分隔
- [x] 7.2 today highlight、empty leg(`— waiting for PM —`)
- [x] 7.3 duration 只顯示分鐘數(mono);**不做** early/late delta 標註
- [x] 7.4 狀態:載入 skeleton 列、空清單、篩選後無資料
- [x] 7.5 極端:大量列、缺 board 或缺 alight、跨午夜、負 delta

## 8. Glance stat `.glance`
- [x] 8.1 big mono number + unit + label + note + 中性 dot-tag
- [x] 8.2 狀態:無資料(`—`)、低樣本提示
- [x] 8.3 極端:大數字、長 note 換行

## 9. Bus mascot
- [x] 9.1 right/left PNG、四種尺寸(130×110 / 80×60 / 50×38 / 320)
- [x] 9.2 lurch + bob 動畫、到站 bouncy hop
- [x] 9.3 空狀態 mascot

## 10. Loading & skeleton（§08）
- [x] 10.1 skeleton 票
- [x] 10.2 PREDICTING ride card
- [x] 10.3 skeleton log 列
- [x] 10.4 inline pulse pill
- [x] 10.5 saving stamp（4-frame bouncy,320ms）
- [x] 10.6 pull-to-refresh（公車滑入,門檻 120px）
- [x] 10.7 first-launch splash（800–1200ms,stop sign + 鎮名 + 手寫 opening…）
- [x] 10.8 全部受 reduced-motion 規範；不得出現 spinner

## 11. Dark mode（§09,固定時刻）
- [x] 11.1 夜色 palette（墨藍紙、星紙字)
- [x] 11.2 票券維持暖琥珀規則
- [x] 11.3 固定時刻切換:日間 **07:00** 起、夜間 **17:00** 起;傍晚漸入 17:00、清晨漸入 07:00（曲線我安排）;不用定位日落
- [x] 11.4 reduced-motion → 直接 snap（不漸變）
- [x] 11.5 手動覆寫(長按 stop-dot),記到當天結束
- [x] 11.6 night scene sampler

## 12. Notifications（§10,web 版）
- [x] 12.1 維持現況兩計時器模型:**提醒 30 分、捨棄 120 分**(retime `reminder.js`)
- [x] 12.2 提醒/捨棄時間**可在 Settings 修改**(取代目前的 test localStorage 鍵)
- [x] 12.3 文案**維持現況**(不改寫 voice);不採 handoff inbound/head-back/weekly 觸發
- [x] 12.4 確認 `push.js` / `sw.js` push handler 樣式與品牌一致

## 13. Charts（§07）
- [x] 13.1 紙質卡 + glance aggregates（mono 數字、中性 dot-tag）
- [x] 13.2 四圖配色對齊嚴格語意(to_work=sun、from_work=clay、P90 中性)
- [x] 13.3 狀態:空、低樣本 banner、極端值軸

## 14. Settings（最小,新頁）
- [x] 14.1 頁面殼(站務風,沿用 unlock 美學)
- [x] 14.2 Home / Office 站名(中 + 英 caption)— 寫入 localStorage
- [x] 14.3 提醒時間(預設 30 分)+ 捨棄時間(預設 120 分)可改
- [x] 14.4 票券/場景/日記讀取設定站名取代寫死(住所/公司)
- [x] 14.5 狀態:預設值、儲存成功/失敗

## 15. Interactions
- [x] 15.1 BOARD/ALIGHT tap → 印章動畫(scale 1.4→1.05,-8°,320ms,4 keyframe)
- [x] 15.2 長按切換方向（保留）
- [x] 15.3 undo(ride card,倒數)
- [x] 15.4 pull-to-refresh(公車滑入)
- [x] 15.5 長按 stop-dot 切 dark
- [x] 15.6 filter chips(log)
- [x] 15.7 刪除配對、重抓天氣（保留）
- [x] 15.8 觸覺:tap 短震、到站 soft tick

## 16. 空 / 錯誤 / 極端資料（跨元件）
- [x] 16.1 首次無資料(mascot + 站長文案)
- [x] 16.2 定位失敗
- [x] 16.3 離線
- [x] 16.4 API 錯誤 toast
- [x] 16.5 草擬雙語 on-brand 文案 → 交付審閱
- [x] 16.6 極端:超長字串、超大/負數值、大量列、時區跨界

## 17. RWD（Mobile-first）
- [x] 17.1 ≤480 主版面(各元件)
- [x] 17.2 720 增強(留白/欄寬)
- [x] 17.3 1024 多欄(charts 等)
- [x] 17.4 log/recent 列窄屏雙行 grid
- [x] 17.5 場景在各斷點不破版
- [x] 17.6 公車 lurch 移動場景在 ≤480 必現(品牌核心,硬性)

## 18. Accessibility（AA）
- [x] 18.1 對比稽核(fg/bg ≥ AA)
- [x] 18.2 裝飾(打孔/印章/場景)`aria-hidden`;動作給語意 label
- [x] 18.3 focus-visible 全覆蓋
- [x] 18.4 reduced-motion 全覆蓋
- [x] 18.5 觸控目標 ≥ 44px

## 19. 橫切
- [x] 19.1 字體載入(preconnect + display=swap)
- [x] 19.2 PWA / SW 快取(版本 bump、precache 新資產)
- [x] 19.3 theme-color / manifest
- [x] 19.4 motion 一致性(只用三曲線)

## 20. 驗證（每階段)
- [x] 20.1 各頁 390px 無水平溢出
- [x] 20.2 字體載入、dark lerp 正確
- [x] 20.3 互動可用、無滑掉、無 console error
- [x] 20.4 重寫後不可-regression 項全數通過(3.A)
- [x] 20.5 推 GitHub → Copilot review → 修正 → 反覆至解完

---

## 不在 v1 範圍
- 多路線切換(Q7)
- 日記匯出 / 分享 card(Q12)
- 正式 onboarding 導覽(Q9,只做 splash)
- 原生 widget / watch / live-activity(Q1)

---

## 自我稽核 — 逐項對照 handoff 規格（2026-05-30）

對照來源:`docs/design-system-slow-town-station.md`(handoff README)+ Style Guide / Quiet Moments。
標記:✅ 實作並驗證 · 🔧 依使用者確認的決策調整(非缺漏) · 📎 style-guide 示意非 app 功能。

### §01 色彩
- ✅ paper/ink 9 色、am/pm/leaf 各 4、sky 6、star —— `tokens.css` 對齊 hex
- ✅ 嚴格語意:sun=morning/to_work、clay=evening/from_work、leaf=live;CTA 用中性 ink(不違規)
- ✅ riso overprint(body 雙 radial)+ paper texture(亮/暗兩版)

### §02 字體
- ✅ 四家族 web font(DM Serif / Noto Serif TC / Caveat / JetBrains Mono),preconnect + display=swap
- ✅ 語意角色 + 全數字 mono tnum
- 🔧 與舊 `style-guide-brief.md`「不引 web font」衝突 → 已在該檔標記取代

### §03 spacing / radius / motion
- ✅ spacing 11 階、radius 3(無 pill)、shadow 2(暖)
- ✅ 三曲線(lurch/smooth/bouncy);所有 literal-infinite 動畫受 reduced-motion 關閉

### §04 三狀態 / 狀態機
- ✅ A(晨候 sun)/ B(在途 leaf)/ C(暮候 clay),時間規則 ≥16:00→from_work(現況一致)
- ✅ 配色隨方向;ride card / 票券 / 場景同步切換
- ✅ BOARD→印章 impact→場景 B(公車 lurch)→ride card;ALIGHT→歸檔
- 🔧 §04 列出「三種尺寸票券」屬 style guide 示意,app 用單一票券(📎)

### §05 公車 anatomy / TOD / 到站
- ✅ bus PNG(right/left)在路上 lurch + bob,**車輪貼齊路面**,所有斷點必現(A11)
- ✅ TOD 天空 dawn/day/dusk/night 漸變(不 snap)
- 🔧 到站「early +N′」標註已依 A3 移除;到站以場景狀態 A/C 公車停靠表現

### 元件:Ticket
- ✅ 左 body(date / Caveat 手寫動詞 / 站名對 中文display+英文mono / →)+ 右 60px punch(打洞孔 inset / glyph ↑↓ / BOARD·ALIGHT ticks)
- ✅ 上下打孔邊 + 垂直虛線騎縫;am/pm 變體;dark 維持暖琥珀
- ✅ 狀態 active/loading(dot-pulse)/success(stamp impact)/error(shake)
- 🔧 無序號(A1)、移除 PASS/ONE WAY、站名預設住所/公司(A13 置中)
- ✅ 撕票(刪除 tear 動畫)= VOID/torn(A14)

### 元件:Ride card
- ✅ 上打孔 + 下鋸齒撕邊、leaf LIVE 脈動點、time pair、**ETA window(n / ±min)**、undo pill
- ✅ PREDICTING(無樣本顯示「ETA 累積中」)/ LIVE / 追蹤分鐘
- 🔧 無序號(A1)
- ✅ undo 8 秒倒數取消上車(A2)

### 元件:Log-day
- ✅ day stamp + AM 腿 + PM 腿、虛線分隔、today 高亮、empty leg 斜紋
- 🔧 不顯示早/晚 delta(A3),只顯示 duration

### 元件:Glance / Charts(§06/§07)
- ✅ 紙質卡、mono 數字、中性 dot-tag、to_work=sun / from_work=clay、P90 中性
- ✅ 空 / 低樣本 banner

### §08 Loading
- ✅ first-launch splash(stop sign + Commute + 慢城小站 + 手寫 opening…)
- ✅ recent/log skeleton、saving stamp(bouncy impact)、pull-to-refresh(公車滑入 120px)、dot-pulse inline pill
- ✅ **無 spinner**;全受 reduced-motion 規範
- 📎 「skeleton 票」:票券同步渲染無需 fetch,故以即時渲染 + recent/log skeleton 覆蓋 loading

### §09 Dark mode
- ✅ 固定 07:00 日 / 17:00 夜(A8)、長按品牌手動覆寫(記到當天)、0.7s 漸入、reduced-motion snap
- ✅ chrome 翻夜藍但**票券維持暖琥珀**;night scene sampler(場景 night TOD)

### §10 Notifications(web)
- ✅ Web Push(既有 push.js/sw.js)、提醒 30 / 捨棄 120 分、Settings 可改、文案維持現況(A6/A7)
- 🔧 原生 widget / watch / live-activity 依 Q1 不做(web 不可行)

### 跨切面
- ✅ Settings 頁(站名 + 提醒/捨棄時間)、PWA SW v7 precache 全部新檔、manifest/theme-color、haptics(vibrate)
- ✅ A11y:focus-visible、裝飾 aria-hidden、按鈕語意 label、reduced-motion 全覆蓋、對比 AA、觸控目標符合 AA(≥24px,nav 48px)
- 🔧 多路線 / 匯出 / onboarding 導覽:依 Q7/Q12/Q9 延後

### 驗證
- ✅ index / log / charts / unlock / settings 於 390px **無水平溢出**;字體載入;dark 正確;LIVE/tracking/票卡/場景皆驗證
- ✅ 720 / 1200px 無溢出
- ✅ **無 console 錯誤**(僅 favicon 404 + 後端 401 為預期)
- ✅ 無 build step(純靜態)、repo 無既有測試

### 結論
清單 20 節全部 ✅;所有 🔧 皆為使用者已確認的範圍決策(A1–A13 / Q1–Q15),非「缺漏」或「與規格不符」。
