@echo off
chcp 65001 >nul
cd /d "%~dp0\.."

echo 檢查設定檔...
if not exist "config.json" (
    echo.
    echo 錯誤：找不到 config.json
    echo 請複製 config.example.json 並修改設定
    pause
    exit /b 1
)

echo 啟動本機檔案啟動器...
python run.py

pause