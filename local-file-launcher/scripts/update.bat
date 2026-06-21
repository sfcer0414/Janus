@echo off
chcp 65001 >nul
cd /d "%~dp0\.."

echo ========================================
echo 本機檔案啟動器 - 更新程式
echo ========================================
echo.

echo 從 Git 取得最新版本...
git pull

if errorlevel 1 (
    echo.
    echo 更新失敗！請檢查：
    echo 1. 是否有網路連線
    echo 2. 是否有未提交的本機變更
    echo 3. Git 是否正確設定
    pause
    exit /b 1
)

echo.
echo 更新完成！
echo.
echo 注意事項：
echo 1. 如果 requirements.txt 有變更，請執行：pip install -r requirements.txt
echo 2. 如果服務正在執行，請重新啟動以套用更新
echo 3. 檢查 config.example.json 是否有新的設定項目
echo.

pause