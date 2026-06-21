# Claude Code 交接文件 — 本機檔案啟動器（Local File Launcher）

> 本文件是**實作規格**，供 Claude Code 直接據以產生程式碼。背景與決策脈絡見另一份《本機檔案啟動器 解決方案文件》。兩者衝突時，以本文件為準。
>
> 建議放置：repo 根目錄 `CLAUDE.md`，或 `docs/HANDOFF.md`。

---

## 0. 給 Claude Code 的指示

- 依「§12 實作順序」分階段實作，每階段完成後對照該階段的「完成判準」自我驗證。
- **整合合約（§8 前端輸出、§9 追蹤事件格式）必須保持穩定**，既有 Chrome 擴充套件依賴它。變更合約前先確認。
- 目標平台為 **Windows 10/11**；但程式須能在非 Windows 上開發與單元測試（見 §5 開檔的跨平台 shim）。
- 相依最小化：`requirements.txt` 只放 `flask`。其餘用 Python 標準庫（`sqlite3`、`threading`、`os`、`getpass`、`socket`、`json`、`pathlib`）。
- 所有 API 錯誤回應統一格式：`{ "ok": false, "error": "<中文說明>" }`，並回傳適當 HTTP 狀態碼。
- 不要引入資料庫伺服器、ORM、前端框架、打包工具。保持輕量。

---

## 1. 專案目標（一段話）

在每台 Windows 電腦背景常駐一支本機服務：於 `http://127.0.0.1:<port>` 提供首頁，列出設定指定資料夾（含子資料夾）的檔案；使用者點檔名即以該機預設軟體開啟該檔。支援子資料夾導覽、當前資料夾關鍵字篩選、公告區塊。首頁輸出對 Chrome 擴充套件友善（可讀取內容與雙向互動）。使用行為（瀏覽／開檔）記錄於本機，並補送到**共用網路資料夾**彙整，供管理者報表查看。三台電腦各自獨立安裝、各指向自己的資料夾；服務僅綁定本機位址；透過 GitHub `git pull` 更新。

---

## 2. 技術棧與限制

| 項目 | 決定 |
|------|------|
| 語言 | Python 3.10+ |
| 後端框架 | Flask（Jinja2 伺服器端渲染） |
| 前端 | Jinja 模板 + 原生 CSS/JS，**不使用前端框架**、不使用 CDN（須離線可用） |
| 資料庫 | 本機事件暫存用標準庫 `sqlite3`（檔案型） |
| 開檔 | Windows 用 `os.startfile`；非 Windows 開發時用 shim（見 §5） |
| 繫結 | 僅 `127.0.0.1`，不對區網/外網開放 |
| 背景排程 | `threading.Timer`（追蹤補送與清理） |

---

## 3. 專案結構（請建立）

```
local-file-launcher/
  run.py                      啟動進入點：載入設定、建立 app、選埠、（選配）開瀏覽器、serve_forever
  requirements.txt            flask
  config.example.json         設定範本（複製為 config.json）
  .gitignore                  config.json / usage.sqlite3 / __pycache__/ / *.pyc
  README.md                   安裝、設定、常駐、更新、疑難排解
  app/
    __init__.py               create_app()：載入設定、註冊 blueprints、啟動追蹤背景工作
    config.py                 讀取/驗證 config.json，提供設定物件與預設值
    core.py                   與框架無關核心：safe_resolve / list_dir / open_file
    announcements.py          讀取 data/announcements.json
    tracking.py               追蹤：本機 sqlite 暫存、背景補送共用資料夾、清理、彙整讀取
    views/
      __init__.py
      files.py                GET / , GET /api/list , POST /api/open
      announcements.py        GET /announcements , GET /api/announcements
      usage.py                GET /admin/usage（報表頁）, GET /api/usage/summary
      track.py                POST /api/track（選配：前端事件回報）
    templates/
      base.html               共用版型：導覽列、頁首頁尾、#filelist-data 容器、靜態資源連結
      files.html              檔案清單頁（extends base）
      announcements.html      公告頁（extends base）
      usage.html              使用報表頁（extends base，含 Chart.js 區塊）
    static/
      css/style.css
      js/
        api.js                fetch /api/list、/api/open 封裝
        render.js             entries -> DOM（<a> + data-*）
        bridge.js             擴充套件橋接：發佈事件/postMessage、接收反向訊息
        app.js                串接：初始化、導覽、篩選、點擊處理
        usage.js              報表頁：讀 /api/usage/summary 畫圖（Chart.js 以本機檔引入）
        vendor/chart.min.js   本機放置（離線；勿用 CDN）
  scripts/
    start.bat                 一般啟動（顯示主控台，供測試）
    start_hidden.vbs          背景啟動（無視窗，pythonw）
    setup_autostart.bat       於「啟動」資料夾建立捷徑
    update.bat                git pull + 提示重啟
  data/
    announcements.json        公告資料來源（陣列）
    usage.sqlite3             本機事件暫存（執行時建立；勿進版控）
  extension-example/          MV3 範例擴充套件（示範讀取與互動）
    manifest.json
    content.js
    README.md
```

---

## 4. 設定檔 `config.json`

```jsonc
{
  "folder": "D:\\公司資料\\共用區",   // 必填；要瀏覽的資料夾。網路位置建議用 UNC：\\\\server\\share\\dir
  "port": 8765,                       // 被占用時自動往後找可用埠
  "title": "部門共用檔案",
  "open_browser": true,
  "show_hidden": false,
  "tracking": {
    "enabled": false,
    "machine_name": "PC-A",            // 省略則用主機名稱
    "shared_log_dir": "\\\\server\\share\\file-launcher-logs",  // UNC，共用網路資料夾
    "flush_interval_seconds": 60,
    "retention_days": 90
  }
}
```

`config.py` 行為：缺漏欄位以預設值補齊；`tracking` 區段可整段省略（視為停用）；`folder` 缺漏或不存在時，API 須回傳明確錯誤而非崩潰。

---

## 5. 核心模組 `core.py`（與框架無關）

```python
def safe_resolve(base: str, rel: str) -> str | None:
    """將 rel 接到 base 後正規化；確認結果等於 base 或位於 base 之下，否則回傳 None。
    需用 os.path.realpath；以 os.sep 前綴比對防止 '..' 穿越。base 由設定 folder 正規化而來。"""

def list_dir(base: str, rel: str, show_hidden: bool) -> dict:
    """列出 base/rel 內容。回傳 §6 GET /api/list 的成功結構（rel/parent/is_root/crumbs/entries）。
    entries：資料夾在前、再依名稱（不分大小寫）排序。每筆含 name/type/size/mtime/ext（見 §7）。
    隱藏規則：show_hidden=False 時略過以 '.' 開頭者與 desktop.ini/Thumbs.db。"""

def open_file(path_abs: str) -> None:
    """以系統預設程式開啟檔案。Windows: os.startfile(path_abs)。
    跨平台 shim（僅供開發/測試）：darwin -> subprocess.Popen(['open', path]); 其他 -> ['xdg-open', path]。"""
```

開檔行為備註（供 README 與測試理解）：`.html` 等檔案的「預設程式」由 OS 關聯決定（HTML 通常為預設瀏覽器，會以 `file://` 開新分頁）；本服務一律走「以預設程式開」的一致行為。

---

## 6. HTTP API 規格

所有路由僅在 `127.0.0.1` 提供。帶 `rel` 的請求一律先經 `safe_resolve`，失敗回 400。

### GET `/`
回傳 `files.html`（檔案清單 + 公告區塊）。

### GET `/api/list?rel=<相對路徑>`
`rel` 省略＝根目錄。成功：
```json
{
  "ok": true,
  "rel": "報表",
  "parent": "",
  "is_root": false,
  "crumbs": [{ "name": "報表", "rel": "報表" }],
  "entries": [
    { "name": "2024", "type": "dir",  "size": 0,     "mtime": "2026-06-18 09:12", "ext": "" },
    { "name": "月報.xlsx", "type": "file", "size": 38912, "mtime": "2026-06-19 08:55", "ext": "xlsx" }
  ]
}
```
失敗：`{ "ok": false, "error": "..." }`（400 路徑非法 / 不存在；500 讀取錯誤）。
副作用：記錄一筆 `list` 事件（見 §9）。

### POST `/api/open`
請求本文：`{ "rel": "報表/月報.xlsx" }`。對 `safe_resolve` 後須為既存檔案。
- 成功：`{ "ok": true, "name": "月報.xlsx" }`，並呼叫 `open_file`，記錄一筆 `open` 事件。
- 失敗：`{ "ok": false, "error": "..." }`（400/500）。

### GET `/announcements` / GET `/api/announcements`
頁面與 JSON。JSON：`{ "ok": true, "items": [ { "title","date","body" } ] }`。讀取記一筆 `view` 事件（type=view, path="announcements"）。

### GET `/admin/usage`（報表頁）/ GET `/api/usage/summary`
讀取共用資料夾彙整（見 §9）。`summary` 回傳供畫圖的彙整資料，例如：
```json
{ "ok": true,
  "range_days": 30,
  "top_files": [{ "path": "報表/月報.xlsx", "count": 42 }],
  "by_machine": [{ "machine": "PC-A", "count": 120 }],
  "by_user": [{ "user": "alice", "count": 88 }],
  "by_day": [{ "date": "2026-06-18", "count": 30 }]
}
```
存取限制：僅本機；可加 `config` 旗標或簡單管理判斷（見 §11）。

### POST `/api/track`（選配）
供前端回報後端看不到的事件（停留、篩選關鍵字等）：`{ "type": "...", "path": "...", "meta": {...} }` → 記錄事件。預設可先不實作，保留端點。

---

## 7. 資料模型

**entry（檔案項目）**：`name:str`、`type:"dir"|"file"`、`size:int`、`mtime:str("YYYY-MM-DD HH:MM")`、`ext:str`（小寫無點，資料夾為空）。

**announcement（公告）**：`title:str`、`date:str("YYYY-MM-DD")`、`body:str`。

**event（使用事件）**：`ts:str(ISO8601含時區)`、`machine:str`、`user:str`、`type:"view"|"list"|"open"`、`path:str`。

---

## 8. 前端與「擴充套件友善」輸出合約（**穩定合約**）

### 8.1 清單 DOM
每個檔案項目須為 `<a>`，帶完整 `data-*`：
```html
<a class="file-link" href="#"
   data-rel="報表/月報.xlsx" data-name="月報.xlsx" data-type="file"
   data-ext="xlsx" data-size="38912" data-mtime="2026-06-19 08:55">月報.xlsx</a>
```
資料夾用 `class="dir-link"`、`data-type="dir"`。點擊：檔案 → `POST /api/open`；資料夾 → 導覽進入（`GET /api/list`）。`href="#"` 並 `preventDefault`。

### 8.2 內嵌結構化資料
`base.html` 內含：`<script id="filelist-data" type="application/json"></script>`，每次渲染後由 `render.js` 寫入 `{ "rel": "...", "entries": [...] }`（同 `/api/list` 的 entries）。

### 8.3 頁面→擴充套件（清單就緒通知）
每次清單渲染完成，`bridge.js` 須同時：
- `document.dispatchEvent(new CustomEvent('filelauncher:list', { detail: { rel, entries } }))`
- `window.postMessage({ source: 'file-launcher', type: 'list', payload: { rel, entries } }, '*')`

### 8.4 擴充套件→頁面（反向互動）
`bridge.js` 監聽 `window` `message`，處理 `source === 'file-launcher-ext'`：
```json
{ "source": "file-launcher-ext", "type": "open",     "rel": "報表/月報.xlsx" }
{ "source": "file-launcher-ext", "type": "navigate", "rel": "報表" }
{ "source": "file-launcher-ext", "type": "refresh" }
```
對應動作：呼叫開檔 / 導覽 / 重新整理。

### 8.5 JS 模組職責
- `api.js`：`listDir(rel)`、`openFile(rel)`（fetch 封裝、統一錯誤處理）。
- `render.js`：`renderList(rel, entries)` → 產生 8.1 DOM、更新 8.2 內嵌 JSON。
- `bridge.js`：發佈 8.3、接收 8.4、（選配）`/api/track`。
- `app.js`：初始化載入根目錄、麵包屑導覽、篩選（當前資料夾即時過濾）、點擊分派。
- `usage.js`：報表頁讀 `/api/usage/summary` 以 Chart.js 畫圖（vendor 本機引入）。

---

## 9. 使用追蹤實作（共用網路資料夾彙整，Pattern B）

### 9.1 原則
- **非阻斷**：使用者操作只「寫本機暫存」（必成功、快）；補送在背景做。
- **容錯**：共用資料夾不可達時，事件留在暫存、下次重試；核心功能不受影響。
- **無寫入衝突**：每台只附加/清理**自己**的紀錄檔。

### 9.2 本機暫存（`data/usage.sqlite3`）
```sql
CREATE TABLE IF NOT EXISTS events (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  ts      TEXT NOT NULL,     -- ISO8601 含時區
  machine TEXT NOT NULL,
  user    TEXT NOT NULL,     -- getpass.getuser()
  type    TEXT NOT NULL,     -- view|list|open
  path    TEXT NOT NULL,
  synced  INTEGER NOT NULL DEFAULT 0
);
```
`record_event(type, path)`：machine 取 `tracking.machine_name` 或 `socket.gethostname()`；user 取 `getpass.getuser()`；ts 取含時區的當下時間。`tracking.enabled=False` 時為 no-op。

### 9.3 背景補送（`threading.Timer`，每 `flush_interval_seconds`）
1. 取出 `synced=0` 的事件。
2. 以 append 模式寫入 `shared_log_dir/<machine_name>.jsonl`（每筆一行 JSON，UTF-8）。
   ```json
   {"ts":"2026-06-19T08:55:12+08:00","machine":"PC-A","user":"alice","type":"open","path":"報表/月報.xlsx"}
   ```
3. 寫入成功 → 標記 `synced=1`。任一步失敗（資料夾不可達等）→ 不標記，下次重試。
4. 接著做保存清理（§9.4）。

### 9.4 保存清理
- 本機：刪除 `synced=1` 且 `ts` 早於 `retention_days` 的列。
- 共用：重寫**自己**的 `<machine_name>.jsonl`，移除早於 `retention_days` 的行（僅該機擁有，無衝突）。

### 9.5 彙整報表
`GET /api/usage/summary`：讀取 `shared_log_dir/*.jsonl`，逐行解析（容忍壞行：跳過），合併計算 top_files / by_machine / by_user / by_day（預設近 30 天）。共用資料夾不可達時回 `{ ok:false, error:"無法讀取共用資料夾" }`，報表頁顯示友善訊息。

---

## 10. 部署腳本與檔案

- `requirements.txt`：`flask`
- `.gitignore`：`config.json`、`data/usage.sqlite3`、`__pycache__/`、`*.pyc`
- `config.example.json`：同 §4。
- `start.bat`：`chcp 65001` → `cd /d "%~dp0\.."`（指向 repo 根）→ 檢查 `config.json` 存在 → `python run.py`。
- `start_hidden.vbs`：以 `pythonw run.py` 無視窗背景啟動（工作目錄設為 repo 根）。
- `setup_autostart.bat`：於 `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup` 建立指向 `start_hidden.vbs` 的捷徑（PowerShell `WScript.Shell.CreateShortcut`）。
- `update.bat`：`chcp 65001` → `git pull` → 提示「若相依有變動執行 pip install；重新登入或重啟服務以生效」。
- `README.md`：安裝（Python+Git、clone、`pip install -r requirements.txt`、複製 config、測試、設定常駐）、更新、疑難排解、網路資料夾用 UNC 的建議。

`.bat` 一律 `chcp 65001 >nul` 並存成 UTF-8，避免中文亂碼。

---

## 11. 安全要求

- 服務 `app.run(host="127.0.0.1", port=...)`，不可繫結 `0.0.0.0`。
- 路徑安全：所有 `rel` 經 `safe_resolve`；`open_file` 僅接受 base 之內的既存檔。
- `/admin/usage`、`/api/usage/summary` 視為管理功能：至少限制僅本機可達；可加 `config` 旗標（如 `admin_enabled`）或簡單通行碼，預設僅本機。
- 追蹤：共用資料夾權限由 IT 限定；僅存必要欄位；README/公告告知使用者；保存期限可設定。
- 支援網路位置：`folder` 與 `shared_log_dir` 皆可為 UNC；文件建議用 UNC 而非磁碟機代號（背景執行時磁碟機對應可能不可見）。

---

## 12. 實作順序（建議任務分解，每階段附完成判準）

**階段 1 — 核心列檔/開檔可用**
- `config.py`、`core.py`（safe_resolve/list_dir/open_file）、`app/__init__.py`、`views/files.py`（`/`、`/api/list`、`/api/open`）、`base.html`、`files.html`、`style.css`、`api.js`/`render.js`/`app.js`（含 8.1 DOM 與 8.2 內嵌 JSON）、`run.py`。
- 完成判準：啟動後 `127.0.0.1:<port>` 顯示根目錄清單；點檔案以預設程式開；非法 `rel` 被 400 擋下。

**階段 2 — 導覽與篩選**
- 子資料夾進入、麵包屑、返回；當前資料夾關鍵字即時篩選。
- 完成判準：能進出多層子資料夾；篩選即時且正確。

**階段 3 — 擴充套件橋接 + 範例擴充套件**
- `bridge.js`（8.3 發佈、8.4 接收）；`extension-example/`（manifest matches localhost+127.0.0.1:port、content.js 讀 `#filelist-data`/`data-*`、監聽 `filelauncher:list`、示範以 postMessage 觸發 open）。
- 完成判準：載入範例擴充套件後，能在主控台印出清單筆數，並能由擴充套件觸發開檔。

**階段 4 — 公告**
- `data/announcements.json`、`announcements.py`、`views/announcements.py`、`announcements.html`、首頁公告區塊。
- 完成判準：公告顯示於首頁與公告頁。

**階段 5 — 使用追蹤與報表**
- `tracking.py`（§9 全部）；在 list/open/view 呼叫 `record_event`；背景 flusher 與清理於 `create_app` 啟動；`views/usage.py`、`usage.html`、`usage.js`、`vendor/chart.min.js`。
- 完成判準：事件寫入本機 sqlite；補送到 `shared_log_dir/<machine>.jsonl`；關閉共用資料夾連線時開檔仍正常、恢復後自動補送；報表頁能合併多機 `*.jsonl` 呈現統計。

**階段 6 — 部署與文件**
- `scripts/*`、`requirements.txt`、`config.example.json`、`.gitignore`、`README.md`。
- 完成判準：依 README 在乾淨環境可安裝、啟動、設定常駐、更新。

---

## 13. 驗收標準（Definition of Done）

1. 啟動後可在本機 Chrome 開啟首頁並看到指定資料夾清單（含 UNC 網路資料夾）。
2. 點檔名以該機預設軟體開啟；點資料夾可進入；麵包屑可返回；篩選可用。
3. 路徑穿越（`..`、絕對路徑逃逸）一律被擋。
4. 首頁輸出符合 §8 合約：`<a>`＋`data-*`、`#filelist-data`、`filelauncher:list` 事件與 `postMessage`；反向訊息可開檔/導覽/重整。範例擴充套件能讀取並互動。
5. 公告顯示正常。
6. `tracking.enabled=true` 時：事件入本機 sqlite，並補送至 `shared_log_dir/<machine>.jsonl`；共用資料夾不可達不影響開檔，恢復後補送；保存期限清理生效。
7. 報表頁能合併三機紀錄並呈現 top_files／by_machine／by_user／by_day。
8. 僅綁定 `127.0.0.1`；無額外重型相依；`.bat` 無中文亂碼。

---

## 14. 與既有 Chrome 擴充套件的關係

既有擴充套件由其他人獨立維護，本專案**不**修改它。本專案的責任是：(a) 維持 §8 輸出合約穩定；(b) 提供 `extension-example/` 作為「如何讀取與互動」的可運作範例。若需調整合約，須同步通知擴充套件維護者。
