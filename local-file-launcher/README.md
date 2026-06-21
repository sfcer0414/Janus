# 本機檔案啟動器 (Local File Launcher)

在本機電腦背景常駐的檔案瀏覽服務，提供 Web 介面瀏覽指定資料夾並以系統預設程式開啟檔案。

## 功能特色

- 📁 **檔案瀏覽**：透過瀏覽器瀏覽本機或網路資料夾
- 🚀 **快速開啟**：點擊檔名即以預設程式開啟
- 🔍 **即時篩選**：支援關鍵字快速篩選檔案
- 📢 **公告系統**：顯示重要公告訊息
- 📊 **使用統計**：追蹤並報表檔案使用情況
- 🔌 **擴充套件支援**：可與 Chrome 擴充套件互動

## 系統需求

- Windows 10/11
- Python 3.10 或更新版本
- Git（用於更新）

## 安裝步驟

### 1. 安裝 Python

從 [Python 官網](https://www.python.org/downloads/) 下載並安裝 Python。
安裝時請勾選「Add Python to PATH」。

### 2. 安裝 Git

從 [Git 官網](https://git-scm.com/download/win) 下載並安裝 Git。

### 3. 取得程式碼

```bash
git clone https://github.com/your-org/local-file-launcher.git
cd local-file-launcher
```

### 4. 安裝相依套件

```bash
pip install -r requirements.txt
```

### 5. 設定程式

複製設定範本：
```bash
copy config.example.json config.json
```

編輯 `config.json`：
```json
{
  "folder": "D:\\公司資料\\共用區",  // 要瀏覽的資料夾
  "port": 8765,                      // 服務連接埠
  "title": "部門共用檔案",           // 網頁標題
  "open_browser": true,              // 啟動時自動開啟瀏覽器
  "show_hidden": false,              // 是否顯示隱藏檔案
  "tracking": {
    "enabled": false,                // 是否啟用使用追蹤
    "machine_name": "PC-A",          // 機器名稱
    "shared_log_dir": "\\\\server\\share\\logs",  // 共用紀錄資料夾
    "flush_interval_seconds": 60,    // 同步間隔（秒）
    "retention_days": 90             // 資料保存天數
  }
}
```

### 6. 測試執行

```bash
python run.py
```

或使用批次檔：
```bash
scripts\start.bat
```

開啟瀏覽器存取 http://127.0.0.1:8765

## 使用網路資料夾

建議使用 UNC 路徑格式存取網路資料夾：

```json
{
  "folder": "\\\\server\\share\\folder",
  "tracking": {
    "shared_log_dir": "\\\\server\\share\\file-launcher-logs"
  }
}
```

**注意**：避免使用磁碟機代號（如 `Z:\`），因為背景服務可能無法存取對應的網路磁碟機。

## 設定開機自動啟動

執行以下批次檔設定開機自動啟動：

```bash
scripts\setup_autostart.bat
```

這會在 Windows 啟動資料夾建立捷徑，下次開機時自動啟動服務。

### 手動設定

1. 開啟啟動資料夾：按 `Win+R`，輸入 `shell:startup`
2. 將 `scripts\start_hidden.vbs` 建立捷徑到啟動資料夾

## 背景執行

使用 VBScript 可在背景執行（無視窗）：

```bash
scripts\start_hidden.vbs
```

## 更新程式

執行更新腳本取得最新版本：

```bash
scripts\update.bat
```

更新後請：
1. 檢查是否有新的相依套件需要安裝
2. 重新啟動服務以套用更新
3. 檢查 `config.example.json` 是否有新設定項目

## 使用追蹤功能

### 啟用追蹤

在 `config.json` 設定：
```json
{
  "tracking": {
    "enabled": true,
    "machine_name": "PC-A",
    "shared_log_dir": "\\\\server\\share\\file-launcher-logs",
    "flush_interval_seconds": 60,
    "retention_days": 90
  }
}
```

### 查看報表

開啟瀏覽器存取：http://127.0.0.1:8765/admin/usage

報表包含：
- 熱門檔案排行
- 各機器使用統計
- 各使用者統計
- 每日使用趨勢

## Chrome 擴充套件整合

### 安裝範例擴充套件

1. 開啟 Chrome 擴充功能頁面：`chrome://extensions/`
2. 開啟「開發人員模式」
3. 點選「載入未封裝項目」
4. 選擇 `extension-example` 資料夾

### 擴充套件功能

- 讀取檔案清單資料
- 監聽清單更新事件
- 遠端控制開檔、導覽
- 快捷鍵支援（Alt+R 重新整理，Alt+H 回根目錄）

## 疑難排解

### 連接埠被佔用

錯誤訊息：`OSError: [Errno 10048] 通訊端位址 (通訊協定/網路位址/連接埠) 只可以使用一次`

解決方法：
1. 修改 `config.json` 中的 `port` 設定
2. 或結束佔用該連接埠的程式

### 無法存取網路資料夾

1. 確認網路連線正常
2. 確認有該資料夾的存取權限
3. 使用 UNC 路徑而非磁碟機代號
4. 確認防火牆未封鎖存取

### Python 找不到

確認 Python 已加入系統 PATH：
```bash
python --version
```

若顯示找不到指令，請重新安裝 Python 並勾選「Add Python to PATH」。

### 無法開啟檔案

1. 確認檔案存在且有讀取權限
2. 確認該檔案類型有設定預設開啟程式
3. 檢查防毒軟體是否封鎖

### 追蹤資料未同步

1. 確認共用資料夾路徑正確且可存取
2. 確認有該資料夾的寫入權限
3. 檢查 `data/usage.sqlite3` 是否有未同步的資料

## 安全注意事項

- 服務僅綁定 `127.0.0.1`，不會對外開放
- `/admin/usage` 報表頁面僅限本機存取
- 追蹤資料僅記錄必要資訊（時間、使用者、檔案路徑）
- 建議定期清理過期的追蹤資料

## 系統架構

```
本機服務 (127.0.0.1:8765)
    ├── 檔案瀏覽 API
    ├── 公告系統
    ├── 使用追蹤（SQLite）
    └── 報表介面

共用網路資料夾
    └── 各機器紀錄檔 (.jsonl)
```

## 授權

內部使用

## 聯絡資訊

如有問題請聯絡 IT 部門