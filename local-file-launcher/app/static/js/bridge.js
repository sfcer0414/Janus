/**
 * 橋接模組：處理與 Chrome 擴充套件的雙向通訊
 */
const Bridge = {
    /**
     * 發佈檔案清單事件（§8.3）
     * @param {string} rel - 當前相對路徑
     * @param {Array} entries - 檔案項目陣列
     */
    publishListEvent(rel, entries) {
        const payload = {
            rel: rel,
            entries: entries
        };

        // 方式 1：CustomEvent
        document.dispatchEvent(new CustomEvent('filelauncher:list', {
            detail: payload
        }));

        // 方式 2：postMessage
        window.postMessage({
            source: 'file-launcher',
            type: 'list',
            payload: payload
        }, '*');

        console.log('[Bridge] 已發佈清單事件', { rel, count: entries.length });
    },

    /**
     * 初始化橋接（監聽擴充套件訊息）
     */
    init() {
        // 監聽來自擴充套件的訊息（§8.4）
        window.addEventListener('message', (event) => {
            // 只處理來自擴充套件的訊息
            if (event.data && event.data.source === 'file-launcher-ext') {
                this.handleExtensionMessage(event.data);
            }
        });

        console.log('[Bridge] 橋接模組已初始化');
    },

    /**
     * 處理擴充套件訊息
     * @param {Object} message - 訊息物件
     */
    handleExtensionMessage(message) {
        console.log('[Bridge] 收到擴充套件訊息:', message);

        switch (message.type) {
            case 'open':
                // 開啟檔案
                if (message.rel) {
                    this.openFile(message.rel);
                }
                break;

            case 'navigate':
                // 導覽到指定資料夾
                if (typeof message.rel !== 'undefined') {
                    this.navigate(message.rel);
                }
                break;

            case 'refresh':
                // 重新整理當前清單
                this.refresh();
                break;

            default:
                console.warn('[Bridge] 未知的訊息類型:', message.type);
        }
    },

    /**
     * 開啟檔案（呼叫 App 模組的方法）
     * @param {string} rel - 檔案相對路徑
     */
    async openFile(rel) {
        try {
            await API.openFile(rel);
            console.log('[Bridge] 已開啟檔案:', rel);

            // 發送追蹤事件（選配）
            API.track('open_via_extension', rel);
        } catch (error) {
            console.error('[Bridge] 開啟檔案失敗:', error);
            alert(`無法開啟檔案: ${error.message}`);
        }
    },

    /**
     * 導覽到指定路徑
     * @param {string} rel - 目標路徑
     */
    async navigate(rel) {
        try {
            // 載入新目錄
            const data = await API.listDir(rel);

            // 渲染清單
            Render.renderList(data.rel || '', data.entries || [], data.parent || '');
            Render.renderBreadcrumb(data.crumbs || []);

            // 發佈事件
            this.publishListEvent(data.rel || '', data.entries || []);

            console.log('[Bridge] 已導覽到:', rel);
        } catch (error) {
            console.error('[Bridge] 導覽失敗:', error);
            Render.showError(error.message);
        }
    },

    /**
     * 重新整理當前清單
     */
    refresh() {
        // 取得當前路徑
        const dataScript = document.getElementById('filelist-data');
        if (dataScript) {
            try {
                const data = JSON.parse(dataScript.textContent || '{}');
                const currentRel = data.rel || '';
                this.navigate(currentRel);
                console.log('[Bridge] 已重新整理:', currentRel);
            } catch (error) {
                console.error('[Bridge] 重新整理失敗:', error);
            }
        }
    },

    /**
     * 發送訊息給擴充套件（選配，供未來擴展）
     * @param {string} type - 訊息類型
     * @param {Object} data - 訊息資料
     */
    sendToExtension(type, data) {
        window.postMessage({
            source: 'file-launcher',
            type: type,
            payload: data
        }, '*');
    }
};