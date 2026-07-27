# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # 开发模式，热更新，端口 5173
npm run build     # 生产构建到 dist/
npm run preview   # 预览构建产物，端口 4173
```

`启动.bat` — 一键安装依赖 + 构建 + 启动 server.cjs（迷你静态服务器）。

## Architecture

### State management: single useReducer + Context

`src/context/AppContext.jsx` is the sole global state. All mutations go through `dispatch(action)`. The `reducer` handles these action types:

- `INIT_DATA` — bootstrap from localStorage on mount
- `SWITCH_ACCOUNT` — load target account's expenses/categories/settings, clear form state
- `ADD_EXPENSE` / `UPDATE_EXPENSE` / `DELETE_EXPENSE` — each saves to localStorage then triggers `syncAccountToFolder`
- `ADD_CATEGORY` / `UPDATE_CATEGORY` / `DELETE_CATEGORY` — same pattern
- `UPDATE_SETTINGS` — merge into settings, persist, sync
- `IMPORT_DATA` — bulk replace expenses + optionally categories/settings
- `SET_THEME` / `SET_LAYOUT` — persist to localStorage keys `expense-tracker-theme` / `expense-tracker-layout`, toggle CSS classes
- `CREATE_ACCOUNT` / `DELETE_ACCOUNT` / `UPDATE_ACCOUNT` — manage account metadata

The `AppProvider` wraps these dispatch calls in `useCallback`-ed helper functions (`switchAccount`, `createAccount`, `deleteAccount`, `triggerSync`, `handleExport`, `handleImport`) and exposes them via context. Components use `useApp()` to get `{ state, dispatch, switchAccount, ... }`.

### Storage: per-account localStorage + optional folder sync

`src/utils/storage.js` — all data is keyed per account:

| Data | localStorage key |
|------|-----------------|
| Account list | `expense-tracker-accounts` |
| Active account ID | `expense-tracker-active-account` |
| Expenses | `account_{id}_expenses` |
| Categories | `account_{id}_categories` |
| Settings | `account_{id}_settings` |

Folder sync uses the File System Access API (`showDirectoryPicker`). A folder handle is held in module scope (`folderHandle`). `syncAccountToFolder(accountId)` writes `expenses.json`, `categories.json`, `settings.json` into a per-account subdirectory. `verifyFolderPermission` re-requests permission on page load (handles aren't serializable, so the handle must be re-obtained).

JSON export/import: `exportToJSON` downloads a dated file; `importFromJSON` reads a file and dispatches `IMPORT_DATA`.

### Theme: CSS variables toggled by `:root.dark`

`src/index.css` defines all colors as CSS variables under `:root` (light) and `:root.dark`. Components never use hardcoded colors — they reference `var(--bg)`, `var(--card-bg)`, `var(--text)`, `var(--text-secondary)`, `var(--border)`, `var(--primary)`, etc.

In `App.jsx`, `useEffect` toggles `root.classList.add/remove('dark')` based on `state.theme`. Date inputs force `color-scheme: light` even in dark mode to keep the calendar picker usable.

### Layout: mobile (centered 480px) vs desktop (full-width)

Controlled by `state.layoutMode`. Toggled via `#root.desktop` CSS class:
- Mobile: `#root { max-width: 480px; margin: 0 auto; }` + bottom `tabBar` navigation
- Desktop: `#root.desktop { max-width: none; margin: 0; }` + tabs in `Header`, sidebar layouts in ExpenseList and Settings

Layout preference persists to `localStorage` key `expense-tracker-layout`.

### Multi-account isolation

Each account gets independent localStorage keys. `switchAccount(accountId)` loads that account's data fresh from localStorage into state. Deleting the active account auto-switches to the first remaining account. The `default` account (id='default') is created on first launch and cannot be deleted. `DELETE_ACCOUNT` enforces `accounts.length > 1` guard.

### Dashboard module system

`Dashboard.jsx` renders a customizable grid of chart modules. `ALL_MODULES` defines available modules (pie, bar, line, heatmap, weekday, histogram, topexp, budget). Summary cards are fixed at the top. Module visibility and order persist to `dashboard-layout-{accountId}` in localStorage. `loadLayout` auto-adds new modules and cleans stale keys on load.

### Stats

`src/utils/stats.js` — pure functions operating on expense arrays:
- `getDateRangeStats(expenses, start, end)` → `{ total, dailyAvg, count, filtered }`
- `getCategoryBreakdown(expenses, categories, selectedCats?)` → sorted by amount
- `getDailyTrend(expenses, monthStr, startDate?, endDate?)` → array of `{ date, fullDate, amount }` with zero-fill for all days in range
- `getMonthlyComparison(expenses, categories, numMonths)` → multi-month totals
- `getBudgetProgress(categories, expenses, monthStr)` → per-category spent vs budget with percentage

### Category system

Default categories (8): 餐饮, 交通, 购物, 住房, 娱乐, 医疗, 教育, 其他. Users can add custom categories per account. Each category has `{ id, name, icon, color, budget }`. The memory file records 12 categories in the user's actual data (added 零食, 礼物, 代付, 红包 from `import_origin.mjs`).

## Key constraints

- File System Access API only works in Chrome/Edge — `isFileSystemAPISupported()` guards all folder operations
- Recharts is the only charting dependency — bundle is ~620KB
- No router — tab switching is purely state-driven via `state.activeTab`
- No backend — everything is client-side only
- Expense form: slides up from bottom on mobile, centered modal on desktop
