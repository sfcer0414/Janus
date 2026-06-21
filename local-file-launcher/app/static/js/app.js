/**
 * 主應用程式模組
 */
const App = {
    currentRel: '',
    allEntries: [],

    /**
     * 初始化應用程式
     */
    init() {
        // 初始化橋接模組
        Bridge.init();

        // 綁定事件
        this.bindEvents();

        // 載入初始資料（如果頁面已有資料）
        this.loadInitialData();

        console.log('[App] 應用程式已初始化');
    },

    /**
     * 載入初始資料
     */
    loadInitialData() {
        const dataScript = document.getElementById('filelist-data');
        if (dataScript) {
            try {
                const data = JSON.parse(dataScript.textContent || '{}');
                if (data.rel !== undefined && data.entries) {
                    this.currentRel = data.rel;
                    this.allEntries = data.entries;

                    // 發佈初始事件給擴充套件
                    Bridge.publishListEvent(data.rel, data.entries);
                }
            } catch (error) {
                console.error('[App] 載入初始資料失敗:', error);
            }
        }

        // 載入公告（如果在首頁）
        if (document.getElementById('announcements-section')) {
            this.loadAnnouncements();
        }
    },

    /**
     * 綁定事件處理器
     */
    bindEvents() {
        // 檔案/資料夾點擊
        document.addEventListener('click', (e) => {
            if (e.target.closest('.file-link')) {
                e.preventDefault();
                const link = e.target.closest('.file-link');
                this.handleFileClick(link);
            } else if (e.target.closest('.dir-link')) {
                e.preventDefault();
                const link = e.target.closest('.dir-link');
                this.handleDirClick(link);
            } else if (e.target.closest('.breadcrumb-item')) {
                e.preventDefault();
                const link = e.target.closest('.breadcrumb-item');
                this.handleBreadcrumbClick(link);
            }
        });

        // 篩選輸入
        const filterInput = document.getElementById('filter-input');
        if (filterInput) {
            filterInput.addEventListener('input', (e) => {
                this.handleFilter(e.target.value);
            });

            // 防止表單提交
            filterInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                }
            });
        }
    },

    /**
     * 處理檔案點擊
     * @param {HTMLElement} link - 連結元素
     */
    async handleFileClick(link) {
        const rel = link.getAttribute('data-rel');
        const name = link.getAttribute('data-name');

        if (!rel) return;

        try {
            console.log('[App] 開啟檔案:', rel);

            // 顯示開啟中狀態（選配）
            link.style.opacity = '0.5';

            // 呼叫 API 開啟檔案
            await API.openFile(rel);

            // 恢復狀態
            link.style.opacity = '';

            // 顯示成功提示（選配）
            this.showToast(`已開啟: ${name}`);

        } catch (error) {
            console.error('[App] 開啟檔案失敗:', error);
            link.style.opacity = '';
            alert(`無法開啟檔案: ${error.message}`);
        }
    },

    /**
     * 處理資料夾點擊
     * @param {HTMLElement} link - 連結元素
     */
    async handleDirClick(link) {
        const rel = link.getAttribute('data-rel');

        if (rel === undefined) return;

        try {
            console.log('[App] 進入資料夾:', rel);

            // 顯示載入中
            Render.showLoading();

            // 載入資料夾內容
            const data = await API.listDir(rel);

            // 更新狀態
            this.currentRel = data.rel || '';
            this.allEntries = data.entries || [];

            // 渲染清單
            Render.renderList(data.rel || '', data.entries || [], data.parent || '');
            Render.renderBreadcrumb(data.crumbs || []);

            // 清空篩選器
            const filterInput = document.getElementById('filter-input');
            if (filterInput) {
                filterInput.value = '';
            }

            // 發佈事件給擴充套件
            Bridge.publishListEvent(data.rel || '', data.entries || []);

            // 捲動到頂部
            window.scrollTo(0, 0);

        } catch (error) {
            console.error('[App] 載入資料夾失敗:', error);
            Render.showError(error.message);
        }
    },

    /**
     * 處理麵包屑點擊
     * @param {HTMLElement} link - 連結元素
     */
    handleBreadcrumbClick(link) {
        const rel = link.getAttribute('data-rel');
        if (rel !== undefined) {
            this.handleDirClick(link);
        }
    },

    /**
     * 處理篩選
     * @param {string} keyword - 篩選關鍵字
     */
    handleFilter(keyword) {
        const entries = document.querySelectorAll('.file-entry[data-name]');
        const normalizedKeyword = keyword.toLowerCase().trim();

        let visibleCount = 0;

        entries.forEach(entry => {
            const name = entry.getAttribute('data-name');
            if (!name) return;

            if (!normalizedKeyword || name.toLowerCase().includes(normalizedKeyword)) {
                entry.classList.remove('hidden');
                visibleCount++;
            } else {
                entry.classList.add('hidden');
            }
        });

        // 顯示無結果訊息（選配）
        this.updateEmptyMessage(visibleCount === 0 && normalizedKeyword !== '');

        // 記錄篩選事件（選配）
        if (normalizedKeyword) {
            API.track('filter', this.currentRel, { keyword: normalizedKeyword });
        }
    },

    /**
     * 更新空訊息
     * @param {boolean} show - 是否顯示
     */
    updateEmptyMessage(show) {
        let emptyMsg = document.querySelector('.filter-empty-message');

        if (show) {
            if (!emptyMsg) {
                const listContainer = document.getElementById('file-list');
                if (listContainer) {
                    emptyMsg = document.createElement('div');
                    emptyMsg.className = 'empty-message filter-empty-message';
                    emptyMsg.textContent = '沒有符合的檔案';
                    listContainer.appendChild(emptyMsg);
                }
            }
        } else {
            if (emptyMsg) {
                emptyMsg.remove();
            }
        }
    },

    /**
     * 顯示提示訊息（選配）
     * @param {string} message - 訊息內容
     */
    showToast(message) {
        // 簡單的提示實作（可後續美化）
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    },

    /**
     * 載入公告
     */
    async loadAnnouncements() {
        try {
            const data = await API.getAnnouncements();
            if (data.ok && data.items && data.items.length > 0) {
                // 渲染公告區塊
                this.renderAnnouncements(data.items);
            }
        } catch (error) {
            console.warn('[App] 載入公告失敗:', error);
        }
    },

    /**
     * 渲染公告
     * @param {Array} items - 公告項目
     */
    renderAnnouncements(items) {
        const previewContainer = document.getElementById('announcements-preview');
        if (!previewContainer) return;

        // 清空現有內容
        previewContainer.innerHTML = '';

        // 只顯示前 3 則公告
        const previewItems = items.slice(0, 3);

        if (previewItems.length === 0) {
            previewContainer.innerHTML = '<p class="empty-message">目前沒有公告</p>';
            return;
        }

        previewItems.forEach(item => {
            const announcementDiv = document.createElement('div');
            announcementDiv.className = 'announcement-preview-item';

            announcementDiv.innerHTML = `
                <div class="announcement-preview-header">
                    <span class="announcement-preview-title">${item.title}</span>
                    <span class="announcement-preview-date">${item.date}</span>
                </div>
                <div class="announcement-preview-body">${item.body}</div>
            `;

            previewContainer.appendChild(announcementDiv);
        });

        console.log(`[App] 已載入 ${previewItems.length} 則公告`);
    }
};

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// 加入簡單動畫樣式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);