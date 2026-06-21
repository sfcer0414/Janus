/**
 * API 模組：封裝與後端的通訊
 */
const API = {
    /**
     * 列出目錄內容
     * @param {string} rel - 相對路徑
     * @returns {Promise<Object>} 目錄內容
     */
    async listDir(rel = '') {
        try {
            const params = new URLSearchParams();
            if (rel) params.append('rel', rel);

            const response = await fetch(`/api/list?${params}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '無法載入檔案清單');
            }

            return data;
        } catch (error) {
            console.error('載入目錄失敗:', error);
            throw error;
        }
    },

    /**
     * 開啟檔案
     * @param {string} rel - 檔案相對路徑
     * @returns {Promise<Object>} 回應資料
     */
    async openFile(rel) {
        try {
            const response = await fetch('/api/open', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ rel })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '無法開啟檔案');
            }

            return data;
        } catch (error) {
            console.error('開啟檔案失敗:', error);
            throw error;
        }
    },

    /**
     * 取得公告
     * @returns {Promise<Object>} 公告資料
     */
    async getAnnouncements() {
        try {
            const response = await fetch('/api/announcements');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '無法載入公告');
            }

            return data;
        } catch (error) {
            console.error('載入公告失敗:', error);
            throw error;
        }
    },

    /**
     * 記錄前端事件
     * @param {string} type - 事件類型
     * @param {string} path - 路徑
     * @param {Object} meta - 額外資料
     * @returns {Promise<void>}
     */
    async track(type, path, meta = {}) {
        try {
            await fetch('/api/track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ type, path, meta })
            });
        } catch (error) {
            // 追蹤失敗不影響主要功能
            console.warn('追蹤事件失敗:', error);
        }
    }
};