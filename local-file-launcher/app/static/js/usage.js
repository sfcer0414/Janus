/**
 * 使用報表模組
 */
const UsageReport = {
    /**
     * 初始化報表頁面
     */
    async init() {
        try {
            // 載入統計資料
            const response = await fetch('/api/usage/summary');
            const data = await response.json();

            if (data.ok) {
                this.renderCharts(data);
            } else {
                this.showError(data.error || '無法載入報表資料');
            }
        } catch (error) {
            console.error('載入報表失敗:', error);
            this.showError('載入報表時發生錯誤');
        }
    },

    /**
     * 渲染圖表
     * @param {Object} data - 統計資料
     */
    renderCharts(data) {
        // 熱門檔案
        if (data.top_files && data.top_files.length > 0) {
            this.renderTopFiles(data.top_files);
        }

        // 依機器統計
        if (data.by_machine && data.by_machine.length > 0) {
            this.renderByMachine(data.by_machine);
        }

        // 依使用者統計
        if (data.by_user && data.by_user.length > 0) {
            this.renderByUser(data.by_user);
        }

        // 每日使用量
        if (data.by_day && data.by_day.length > 0) {
            this.renderByDay(data.by_day);
        }
    },

    /**
     * 渲染熱門檔案圖表
     * @param {Array} files - 檔案資料
     */
    renderTopFiles(files) {
        const ctx = document.getElementById('chart-files');
        if (!ctx) return;

        // 限制顯示前 10 個
        const topFiles = files.slice(0, 10);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topFiles.map(f => this.truncateFileName(f.path)),
                datasets: [{
                    label: '開啟次數',
                    data: topFiles.map(f => f.count),
                    backgroundColor: 'rgba(52, 152, 219, 0.6)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    },

    /**
     * 渲染依機器統計圖表
     * @param {Array} machines - 機器資料
     */
    renderByMachine(machines) {
        const ctx = document.getElementById('chart-machines');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: machines.map(m => m.machine),
                datasets: [{
                    data: machines.map(m => m.count),
                    backgroundColor: [
                        'rgba(231, 76, 60, 0.6)',
                        'rgba(52, 152, 219, 0.6)',
                        'rgba(46, 204, 113, 0.6)',
                        'rgba(241, 196, 15, 0.6)',
                        'rgba(155, 89, 182, 0.6)'
                    ],
                    borderColor: [
                        'rgba(231, 76, 60, 1)',
                        'rgba(52, 152, 219, 1)',
                        'rgba(46, 204, 113, 1)',
                        'rgba(241, 196, 15, 1)',
                        'rgba(155, 89, 182, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    },

    /**
     * 渲染依使用者統計圖表
     * @param {Array} users - 使用者資料
     */
    renderByUser(users) {
        const ctx = document.getElementById('chart-users');
        if (!ctx) return;

        // 限制顯示前 10 個
        const topUsers = users.slice(0, 10);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topUsers.map(u => u.user),
                datasets: [{
                    label: '使用次數',
                    data: topUsers.map(u => u.count),
                    backgroundColor: 'rgba(46, 204, 113, 0.6)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    },

    /**
     * 渲染每日使用量圖表
     * @param {Array} days - 每日資料
     */
    renderByDay(days) {
        const ctx = document.getElementById('chart-daily');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: days.map(d => d.date),
                datasets: [{
                    label: '使用次數',
                    data: days.map(d => d.count),
                    backgroundColor: 'rgba(241, 196, 15, 0.2)',
                    borderColor: 'rgba(241, 196, 15, 1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    },

    /**
     * 截斷檔案名稱
     * @param {string} path - 檔案路徑
     * @returns {string} 截斷後的名稱
     */
    truncateFileName(path) {
        const maxLength = 30;
        if (path.length <= maxLength) return path;

        const parts = path.split('/');
        const fileName = parts[parts.length - 1];

        if (fileName.length <= maxLength) {
            return '.../' + fileName;
        }

        return '...' + fileName.substr(fileName.length - maxLength + 3);
    },

    /**
     * 顯示錯誤訊息
     * @param {string} message - 錯誤訊息
     */
    showError(message) {
        const container = document.querySelector('.usage-container');
        if (container) {
            container.innerHTML = `
                <h2>使用報表</h2>
                <div class="error-message">${message}</div>
            `;
        }
    }
};

// 頁面載入完成後初始化
if (document.querySelector('.usage-container')) {
    document.addEventListener('DOMContentLoaded', () => {
        UsageReport.init();
    });
}