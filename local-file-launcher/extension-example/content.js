/**
 * 本機檔案啟動器擴充套件範例
 *
 * 這是一個示範如何與本機檔案啟動器互動的 Chrome 擴充套件
 */

console.log('[擴充套件] 本機檔案啟動器擴充套件已載入');

// 1. 讀取內嵌結構化資料（§8.2）
function readEmbeddedData() {
    const dataScript = document.getElementById('filelist-data');
    if (dataScript) {
        try {
            const data = JSON.parse(dataScript.textContent || '{}');
            console.log('[擴充套件] 讀取內嵌資料:', data);
            return data;
        } catch (error) {
            console.error('[擴充套件] 解析內嵌資料失敗:', error);
        }
    }
    return null;
}

// 2. 讀取 DOM 中的檔案清單（§8.1）
function readFileListFromDOM() {
    const files = [];
    const links = document.querySelectorAll('.file-link, .dir-link');

    links.forEach(link => {
        files.push({
            rel: link.getAttribute('data-rel'),
            name: link.getAttribute('data-name'),
            type: link.getAttribute('data-type'),
            ext: link.getAttribute('data-ext'),
            size: parseInt(link.getAttribute('data-size') || '0'),
            mtime: link.getAttribute('data-mtime')
        });
    });

    console.log(`[擴充套件] 從 DOM 讀取到 ${files.length} 個項目`);
    return files;
}

// 3. 監聽清單更新事件（§8.3）
document.addEventListener('filelauncher:list', (event) => {
    console.log('[擴充套件] 收到清單更新事件:', event.detail);
    console.log(`[擴充套件] 當前路徑: ${event.detail.rel}`);
    console.log(`[擴充套件] 檔案數量: ${event.detail.entries.length}`);

    // 示範：找出所有 Excel 檔案
    const excelFiles = event.detail.entries.filter(e =>
        e.type === 'file' && ['xls', 'xlsx'].includes(e.ext)
    );

    if (excelFiles.length > 0) {
        console.log(`[擴充套件] 發現 ${excelFiles.length} 個 Excel 檔案:`, excelFiles);
    }
});

// 4. 監聽 postMessage 事件（另一種接收方式）
window.addEventListener('message', (event) => {
    if (event.data && event.data.source === 'file-launcher') {
        console.log('[擴充套件] 收到 postMessage:', event.data);
    }
});

// 5. 發送控制訊息給頁面（§8.4）
function sendCommand(type, data = {}) {
    const message = {
        source: 'file-launcher-ext',
        type: type,
        ...data
    };

    window.postMessage(message, '*');
    console.log('[擴充套件] 發送指令:', message);
}

// 6. 建立測試按鈕面板
function createTestPanel() {
    const panel = document.createElement('div');
    panel.id = 'ext-test-panel';
    panel.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: #2c3e50;
        color: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: monospace;
        font-size: 12px;
    `;

    panel.innerHTML = `
        <div style="margin-bottom: 10px; font-weight: bold;">擴充套件測試面板</div>
        <button id="ext-btn-read">讀取資料</button>
        <button id="ext-btn-refresh">重新整理</button>
        <button id="ext-btn-root">回根目錄</button>
        <button id="ext-btn-open">開啟第一個檔案</button>
        <button id="ext-btn-close" style="float: right;">×</button>
    `;

    document.body.appendChild(panel);

    // 綁定按鈕事件
    document.getElementById('ext-btn-read').addEventListener('click', () => {
        const embedded = readEmbeddedData();
        const dom = readFileListFromDOM();
        console.log('[擴充套件] 內嵌資料:', embedded);
        console.log('[擴充套件] DOM 資料:', dom);
        alert(`找到 ${dom.length} 個檔案/資料夾`);
    });

    document.getElementById('ext-btn-refresh').addEventListener('click', () => {
        sendCommand('refresh');
    });

    document.getElementById('ext-btn-root').addEventListener('click', () => {
        sendCommand('navigate', { rel: '' });
    });

    document.getElementById('ext-btn-open').addEventListener('click', () => {
        const firstFile = document.querySelector('.file-link');
        if (firstFile) {
            const rel = firstFile.getAttribute('data-rel');
            sendCommand('open', { rel: rel });
        } else {
            alert('沒有找到檔案');
        }
    });

    document.getElementById('ext-btn-close').addEventListener('click', () => {
        panel.remove();
    });
}

// 7. 頁面載入完成後初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function init() {
    console.log('[擴充套件] 初始化中...');

    // 讀取初始資料
    const data = readEmbeddedData();
    if (data && data.entries) {
        console.log(`[擴充套件] 初始載入: ${data.entries.length} 個項目`);
    }

    // 建立測試面板（可選）
    createTestPanel();

    // 示範：增加快捷鍵支援
    document.addEventListener('keydown', (e) => {
        // Alt + R: 重新整理
        if (e.altKey && e.key === 'r') {
            e.preventDefault();
            sendCommand('refresh');
        }
        // Alt + H: 回根目錄
        if (e.altKey && e.key === 'h') {
            e.preventDefault();
            sendCommand('navigate', { rel: '' });
        }
    });

    console.log('[擴充套件] 初始化完成');
    console.log('[擴充套件] 快捷鍵: Alt+R 重新整理, Alt+H 回根目錄');
}

// 8. 進階功能示範：自動偵測並標記特定檔案
function highlightImportantFiles() {
    const importantExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx'];

    document.querySelectorAll('.file-link').forEach(link => {
        const ext = link.getAttribute('data-ext');
        if (importantExtensions.includes(ext)) {
            link.style.fontWeight = 'bold';
            link.style.color = '#e74c3c';
        }
    });
}

// 監聽 DOM 變化，在清單更新時自動標記
const observer = new MutationObserver(() => {
    highlightImportantFiles();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// 初次標記
highlightImportantFiles();