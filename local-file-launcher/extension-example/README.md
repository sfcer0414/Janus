# 本機檔案啟動器擴充套件範例

這是一個示範如何與本機檔案啟動器互動的 Chrome 擴充套件範例。

## 功能示範

1. **讀取檔案清單資料**
   - 從內嵌 JSON (`#filelist-data`) 讀取
   - 從 DOM 元素 (`data-*` 屬性) 讀取

2. **監聽清單更新事件**
   - CustomEvent: `filelauncher:list`
   - postMessage 事件

3. **控制頁面**
   - 開啟檔案
   - 導覽到資料夾
   - 重新整理清單

4. **測試面板**
   - 視覺化控制介面
   - 快捷鍵支援 (Alt+R, Alt+H)

5. **進階功能**
   - 自動標記重要檔案 (PDF, Office 文件)
   - 統計檔案類型

## 安裝方式

1. 開啟 Chrome 瀏覽器
2. 進入擴充功能管理頁面 (`chrome://extensions/`)
3. 開啟「開發人員模式」
4. 點選「載入未封裝項目」
5. 選擇 `extension-example` 資料夾

## 使用方式

1. 確認本機檔案啟動器正在執行 (`http://127.0.0.1:8765`)
2. 開啟服務頁面
3. 檢查瀏覽器控制台 (F12) 查看擴充套件輸出
4. 使用測試面板或快捷鍵測試功能

## 主要 API

### 接收資料

```javascript
// 方式 1: 讀取內嵌 JSON
const dataScript = document.getElementById('filelist-data');
const data = JSON.parse(dataScript.textContent);

// 方式 2: 讀取 DOM
const links = document.querySelectorAll('.file-link, .dir-link');

// 方式 3: 監聽事件
document.addEventListener('filelauncher:list', (event) => {
    console.log(event.detail.entries);
});
```

### 發送控制指令

```javascript
// 開啟檔案
window.postMessage({
    source: 'file-launcher-ext',
    type: 'open',
    rel: '報表/月報.xlsx'
}, '*');

// 導覽到資料夾
window.postMessage({
    source: 'file-launcher-ext',
    type: 'navigate',
    rel: '報表'
}, '*');

// 重新整理
window.postMessage({
    source: 'file-launcher-ext',
    type: 'refresh'
}, '*');
```

## 開發提示

- 使用瀏覽器控制台查看詳細的 log 輸出
- 所有擴充套件的訊息都會以 `[擴充套件]` 開頭
- 修改 content.js 後需要在擴充功能頁面點選重新載入按鈕
- 確認 manifest.json 的 matches 包含服務使用的連接埠

## 注意事項

- 這只是範例程式碼，實際使用時應根據需求調整
- 注意處理錯誤情況和邊界條件
- 考慮使用者隱私和安全性