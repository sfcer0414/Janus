/**
 * 認證模組
 */
const AuthManager = {
    /**
     * 初始化認證狀態
     */
    async init() {
        // 取得當前使用者
        const userInfo = await this.getCurrentUser();

        if (userInfo.logged_in) {
            this.updateUI(userInfo.username);
        }

        // 綁定登出按鈕
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    },

    /**
     * 取得當前登入的使用者
     */
    async getCurrentUser() {
        try {
            const response = await fetch('/api/current-user');
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('取得使用者資訊失敗:', error);
            return { logged_in: false };
        }
    },

    /**
     * 更新 UI 顯示
     */
    updateUI(username) {
        const userElement = document.getElementById('currentUser');
        const logoutBtn = document.getElementById('logoutBtn');

        if (username) {
            if (userElement) {
                userElement.textContent = `👤 ${username}`;
            }
            if (logoutBtn) {
                logoutBtn.style.display = 'inline-block';
            }
        } else {
            if (userElement) {
                userElement.textContent = '';
            }
            if (logoutBtn) {
                logoutBtn.style.display = 'none';
            }
        }
    },

    /**
     * 登出
     */
    async logout() {
        if (!confirm('確定要登出嗎？')) {
            return;
        }

        try {
            const response = await fetch('/api/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.ok) {
                // 重導向到登入頁
                window.location.href = '/login';
            } else {
                alert('登出失敗：' + (data.error || '未知錯誤'));
            }
        } catch (error) {
            console.error('登出失敗:', error);
            alert('登出失敗：網路錯誤');
        }
    },

    /**
     * 檢查登入狀態，如果未登入則重導向到登入頁
     */
    async requireAuth() {
        const userInfo = await this.getCurrentUser();

        if (!userInfo.logged_in) {
            window.location.href = '/login';
            return false;
        }

        return true;
    },

    /**
     * 取得 Cookie 值
     */
    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            return parts.pop().split(';').shift();
        }
        return null;
    }
};

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', () => {
    AuthManager.init();

    // 處理下拉選單
    const dropdown = document.querySelector('.dropdown');
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const dropdownMenu = document.querySelector('.dropdown-menu');

    if (dropdown && dropdownToggle) {
        let isMenuOpen = false;
        let hoverTimeout = null;

        // 點擊切換選單
        dropdownToggle.addEventListener('click', (e) => {
            e.preventDefault();
            isMenuOpen = !isMenuOpen;
            dropdown.classList.toggle('active', isMenuOpen);
        });

        // 滑鼠進入時顯示選單
        dropdown.addEventListener('mouseenter', () => {
            clearTimeout(hoverTimeout);
            dropdown.classList.add('active');
        });

        // 滑鼠離開時延遲關閉（給使用者時間移到選單）
        dropdown.addEventListener('mouseleave', () => {
            hoverTimeout = setTimeout(() => {
                if (!isMenuOpen) {
                    dropdown.classList.remove('active');
                }
            }, 100);
        });

        // 點擊選單項目後關閉選單
        if (dropdownMenu) {
            dropdownMenu.addEventListener('click', (e) => {
                if (e.target.tagName === 'A') {
                    dropdown.classList.remove('active');
                    isMenuOpen = false;
                }
            });
        }

        // 點擊外部關閉選單
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
                isMenuOpen = false;
            }
        });
    }
});