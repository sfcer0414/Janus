/**
 * 使用者統計模組
 */
const UserStats = {
    currentUser: null,
    currentPeriod: 'month',
    charts: {},

    /**
     * 初始化
     */
    async init() {
        // 載入使用者列表
        await this.loadUsers();

        // 綁定事件
        this.bindEvents();

        // 載入比較表
        this.loadComparison();
    },

    /**
     * 綁定事件
     */
    bindEvents() {
        // 使用者選擇
        const userSelect = document.getElementById('userSelect');
        if (userSelect) {
            userSelect.addEventListener('change', (e) => {
                this.currentUser = e.target.value;
                if (this.currentUser) {
                    this.loadUserStats();
                }
            });
        }

        // 期間切換
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentPeriod = e.target.dataset.period;
                if (this.currentUser) {
                    this.loadUserStats();
                }
            });
        });

        // 重新整理按鈕
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadUserStats();
                this.loadComparison();
            });
        }
    },

    /**
     * 載入使用者列表
     */
    async loadUsers() {
        try {
            const response = await fetch('/api/admin/user-stats/users');
            const data = await response.json();

            if (data.ok) {
                const select = document.getElementById('userSelect');
                select.innerHTML = '<option value="">請選擇使用者</option>';

                data.users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user;
                    option.textContent = user;
                    if (user === data.current_user) {
                        option.selected = true;
                        option.textContent += ' (您)';
                    }
                    select.appendChild(option);
                });

                // 如果有預設使用者，載入其統計
                if (data.current_user && data.users.includes(data.current_user)) {
                    this.currentUser = data.current_user;
                    await this.loadUserStats();
                }
            }
        } catch (error) {
            console.error('載入使用者列表失敗:', error);
        }
    },

    /**
     * 載入使用者統計
     */
    async loadUserStats() {
        if (!this.currentUser) return;

        try {
            const response = await fetch(`/api/admin/user-stats/details?user=${encodeURIComponent(this.currentUser)}&period=${this.currentPeriod}`);
            const data = await response.json();

            if (data.ok) {
                this.renderStats(data.stats);
            }
        } catch (error) {
            console.error('載入統計失敗:', error);
        }
    },

    /**
     * 渲染統計數據
     */
    renderStats(stats) {
        // 更新關鍵指標
        document.getElementById('totalOpens').textContent = stats.total_opens || '0';
        document.getElementById('totalViews').textContent = stats.total_views || '0';
        document.getElementById('timeSaved').textContent = stats.efficiency_metrics?.time_saved || '0 分鐘';
        document.getElementById('productivityScore').textContent = stats.efficiency_metrics?.productivity_score || '0';

        // 渲染每日使用趨勢
        this.renderDailyUsage(stats.daily_usage);

        // 渲染檔案排名
        this.renderFileRanking(stats.file_ranking);

        // 渲染時段分析
        this.renderHourlyUsage(stats.hourly_usage);

        // 渲染檔案類型
        this.renderFileTypes(stats.file_types);

        // 渲染週統計
        this.renderWeeklySummary(stats.weekly_summary);
    },

    /**
     * 渲染每日使用趨勢
     */
    renderDailyUsage(dailyData) {
        const ctx = document.getElementById('dailyUsageChart');
        if (!ctx) return;

        // 銷毀舊圖表
        if (this.charts.daily) {
            this.charts.daily.destroy();
        }

        this.charts.daily = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dailyData.map(d => {
                    const date = new Date(d.date);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                }),
                datasets: [{
                    label: '使用次數',
                    data: dailyData.map(d => d.count),
                    borderColor: 'rgba(52, 152, 219, 1)',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: 10
                    }
                },
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
     * 渲染檔案排名
     */
    renderFileRanking(files) {
        const container = document.getElementById('fileRanking');
        if (!container) return;

        if (!files || files.length === 0) {
            container.innerHTML = '<li class="no-data">暫無數據</li>';
            return;
        }

        container.innerHTML = files.map((file, index) => `
            <li class="file-item">
                <span class="file-name" title="${file.path}">
                    ${index + 1}. ${file.path.split('/').pop()}
                </span>
                <span class="file-count">${file.count} 次</span>
            </li>
        `).join('');
    },

    /**
     * 渲染時段分析
     */
    renderHourlyUsage(hourlyData) {
        const ctx = document.getElementById('hourlyChart');
        if (!ctx) return;

        // 銷毀舊圖表
        if (this.charts.hourly) {
            this.charts.hourly.destroy();
        }

        // 生成24小時標籤
        const labels = Array.from({length: 24}, (_, i) => `${i}:00`);

        this.charts.hourly = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '使用次數',
                    data: hourlyData,
                    backgroundColor: 'rgba(46, 204, 113, 0.7)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 0
                        }
                    }
                }
            }
        });
    },

    /**
     * 渲染檔案類型
     */
    renderFileTypes(fileTypes) {
        const ctx = document.getElementById('fileTypesChart');
        if (!ctx) return;

        // 銷毀舊圖表
        if (this.charts.fileTypes) {
            this.charts.fileTypes.destroy();
        }

        const types = Object.keys(fileTypes);
        const counts = Object.values(fileTypes);

        if (types.length === 0) {
            // 沒有數據時顯示空圖表
            ctx.style.display = 'none';
            return;
        }

        ctx.style.display = 'block';

        this.charts.fileTypes = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: types.map(t => t.toUpperCase()),
                datasets: [{
                    data: counts,
                    backgroundColor: [
                        'rgba(231, 76, 60, 0.7)',
                        'rgba(52, 152, 219, 0.7)',
                        'rgba(46, 204, 113, 0.7)',
                        'rgba(241, 196, 15, 0.7)',
                        'rgba(155, 89, 182, 0.7)'
                    ],
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    },

    /**
     * 渲染週統計
     */
    renderWeeklySummary(weeklyData) {
        const ctx = document.getElementById('weeklyChart');
        if (!ctx) return;

        // 銷毀舊圖表
        if (this.charts.weekly) {
            this.charts.weekly.destroy();
        }

        if (!weeklyData || weeklyData.length === 0) {
            ctx.style.display = 'none';
            return;
        }

        ctx.style.display = 'block';

        this.charts.weekly = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: weeklyData.map(w => w.week),
                datasets: [{
                    label: '開檔次數',
                    data: weeklyData.map(w => w.opens),
                    backgroundColor: 'rgba(241, 196, 15, 0.7)',
                    borderColor: 'rgba(241, 196, 15, 1)',
                    borderWidth: 1,
                    borderRadius: 4
                }, {
                    label: '總操作次數',
                    data: weeklyData.map(w => w.total),
                    backgroundColor: 'rgba(52, 152, 219, 0.7)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
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
     * 載入使用者比較
     */
    async loadComparison() {
        try {
            const response = await fetch('/api/admin/user-stats/comparison');
            const data = await response.json();

            if (data.ok) {
                this.renderComparison(data.comparison);
            }
        } catch (error) {
            console.error('載入比較失敗:', error);
        }
    },

    /**
     * 渲染比較表
     */
    renderComparison(comparison) {
        const tbody = document.getElementById('comparisonBody');
        if (!tbody) return;

        if (!comparison || comparison.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">暫無數據</td></tr>';
            return;
        }

        tbody.innerHTML = comparison.map((user, index) => {
            let badge = '';
            if (index === 0) badge = '<span class="badge badge-gold">🥇</span>';
            else if (index === 1) badge = '<span class="badge badge-silver">🥈</span>';
            else if (index === 2) badge = '<span class="badge badge-bronze">🥉</span>';

            return `
                <tr>
                    <td>${index + 1} ${badge}</td>
                    <td>${user.user}</td>
                    <td>${user.total_opens}</td>
                    <td>${user.total_events}</td>
                    <td>
                        <div style="display: flex; align-items: center;">
                            <div style="width: 100px; height: 8px; background: #ecf0f1; border-radius: 4px; margin-right: 10px;">
                                <div style="width: ${user.productivity_score}%; height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 4px;"></div>
                            </div>
                            ${user.productivity_score}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
};

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    UserStats.init();
});