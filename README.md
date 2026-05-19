# Commute

個人通勤紀錄 PWA。一鍵記錄上下班、上下車事件，自動帶天氣與時間維度，累積後產生圖表並提供到站預測。

純靜態網頁（HTML + ES module JS、無 build step）+ Supabase（Postgres，獨立 `commute` schema、RPC + bcrypt secret）。

## 結構

```
public/                     # 靜態網頁，部署這個目錄即可
  index.html  log.html  charts.html  unlock.html
  manifest.webmanifest  sw.js
  css/  js/  icons/
supabase/migrations/
  0001_init.sql             # schema + view + RPC（全部安全模型在此）
```

## 部署

1. **建 Supabase 專案**（dashboard 或 MCP），套用 `supabase/migrations/0001_init.sql`。
2. **暴露 `commute` schema**：Dashboard → API → Exposed schemas 加入 `commute`，或
   ```sql
   alter role authenticator set pgrst.db_schemas = 'public, commute, graphql_public';
   notify pgrst, 'reload config';
   ```
3. **設定 secret hash**（透過 SQL Editor）：
   ```sql
   insert into commute.config (key, value)
   values ('secret_hash', crypt('your-random-secret-here', gen_salt('bf', 10)));
   ```
   把 `your-random-secret-here` 換成你自選的字串（不會出現在前端原始碼）。
4. **填 Supabase URL 與 anon key**：編輯 `public/js/config.js`，把 `REPLACE_ME` 換成 Dashboard → Settings → API 裡的值。
   anon key 是 public 的、可以出現在前端；安全靠 RLS 完全擋住 anon 直接讀寫 + RPC 內 bcrypt 比對 secret。
5. **部署靜態**：把 `public/` 目錄丟到 Cloudflare Pages / GitHub Pages / Netlify / Vercel static 都可。
6. **iPhone 安裝**：Safari 打開 `https://<your-domain>/?key=<your-secret>` → localStorage 儲存 secret → 分享 → 加入主畫面。之後從圖示開即可。

## 本地開發

```bash
cd public && python3 -m http.server 8080
# 或 npx serve public
```

開 `http://localhost:8080/unlock.html`，貼 secret → 進首頁。
首次按按鈕會跳定位權限；拒絕時 weather 走 `unknown` fallback。

## 設計

詳細 UI/UX 規格與技術選型在 plan：`/root/.claude/plans/commute-tracking-dapper-scroll.md`（本機）。

## 兩階段

- **Phase 1**（本版）：migration、4 大按鈕、log/charts 頁、預測（樣本不足回 null）、PWA。
- **Phase 2**（資料 ≥ 30 筆後）：toast 顯示更多上下文、offline POST queue、box plot 圖表。
