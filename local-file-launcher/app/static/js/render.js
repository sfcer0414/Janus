/**
 * 渲染模組：負責生成 DOM 元素
 */
const Render = {
    /**
     * 渲染檔案清單
     * @param {string} rel - 當前相對路徑
     * @param {Array} entries - 檔案項目陣列
     * @param {string} parent - 父路徑
     */
    renderList(rel, entries, parent = '') {
        const listContainer = document.getElementById('file-list');
        if (!listContainer) return;

        // 清空現有內容
        listContainer.innerHTML = '';

        // 處理路徑格式
        const currentPath = rel.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

        // 如果有父路徑，加入返回連結
        if (parent) {
            const backEntry = document.createElement('div');
            backEntry.className = 'file-entry';

            const backLink = document.createElement('a');
            backLink.href = '#';
            backLink.className = 'dir-link';
            backLink.setAttribute('data-rel', parent);
            backLink.setAttribute('data-type', 'dir');
            backLink.innerHTML = '<span class="icon">📁</span> ..';

            backEntry.appendChild(backLink);
            listContainer.appendChild(backEntry);
        }

        // 渲染每個項目
        entries.forEach(entry => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'file-entry';
            entryDiv.setAttribute('data-name', entry.name);

            const link = document.createElement('a');
            link.href = '#';

            // 計算項目的相對路徑（確保不會有前導斜線）
            const itemRel = currentPath && currentPath !== '' ? `${currentPath}/${entry.name}` : entry.name;

            // 設定 data 屬性（符合 §8.1 規格）
            link.setAttribute('data-rel', itemRel);
            link.setAttribute('data-name', entry.name);
            link.setAttribute('data-type', entry.type);
            link.setAttribute('data-ext', entry.ext || '');
            link.setAttribute('data-size', entry.size.toString());
            link.setAttribute('data-mtime', entry.mtime);

            if (entry.type === 'dir') {
                link.className = 'dir-link';
                link.innerHTML = `<span class="icon">📁</span> ${entry.name}`;
            } else {
                link.className = 'file-link';
                link.innerHTML = `<span class="icon">📄</span> ${entry.name}`;
            }

            entryDiv.appendChild(link);

            // 檔案資訊
            if (entry.type === 'file') {
                const info = document.createElement('span');
                info.className = 'file-info';
                info.textContent = `${this.formatFileSize(entry.size)} • ${entry.mtime}`;
                entryDiv.appendChild(info);
            }

            listContainer.appendChild(entryDiv);
        });

        // 更新內嵌資料（§8.2）
        this.updateEmbeddedData(rel, entries);
    },

    /**
     * 更新內嵌結構化資料
     * @param {string} rel - 當前相對路徑
     * @param {Array} entries - 檔案項目陣列
     */
    updateEmbeddedData(rel, entries) {
        const dataScript = document.getElementById('filelist-data');
        if (dataScript) {
            const data = {
                rel: rel,
                entries: entries
            };
            dataScript.textContent = JSON.stringify(data);
        }
    },

    /**
     * 渲染麵包屑
     * @param {Array} crumbs - 麵包屑陣列
     */
    renderBreadcrumb(crumbs) {
        const breadcrumb = document.querySelector('.breadcrumb');
        if (!breadcrumb) return;

        breadcrumb.innerHTML = '';

        // 根目錄
        const root = document.createElement('a');
        root.href = '#';
        root.className = 'breadcrumb-item';
        root.setAttribute('data-rel', '');
        root.textContent = '根目錄';
        breadcrumb.appendChild(root);

        // 其他層級
        if (crumbs && crumbs.length > 0) {
            crumbs.forEach(crumb => {
                const separator = document.createElement('span');
                separator.className = 'breadcrumb-separator';
                separator.textContent = '/';
                breadcrumb.appendChild(separator);

                const link = document.createElement('a');
                link.href = '#';
                link.className = 'breadcrumb-item';
                link.setAttribute('data-rel', crumb.rel);
                link.textContent = crumb.name;
                breadcrumb.appendChild(link);
            });
        }
    },

    /**
     * 格式化檔案大小
     * @param {number} bytes - 位元組數
     * @returns {string} 格式化的檔案大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';

        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
    },

    /**
     * 顯示錯誤訊息
     * @param {string} message - 錯誤訊息
     */
    showError(message) {
        const listContainer = document.getElementById('file-list');
        if (!listContainer) return;

        listContainer.innerHTML = `
            <div class="error-message">
                ${message}
            </div>
        `;
    },

    /**
     * 顯示載入中
     */
    showLoading() {
        const listContainer = document.getElementById('file-list');
        if (!listContainer) return;

        listContainer.innerHTML = `
            <div class="empty-message">
                載入中...
            </div>
        `;
    }
};