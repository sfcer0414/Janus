@echo off
chcp 65001 >nul

echo 設定開機自動啟動...

set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set VBS_PATH=%~dp0start_hidden.vbs
set SHORTCUT_PATH=%STARTUP_DIR%\本機檔案啟動器.lnk

powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT_PATH%'); $Shortcut.TargetPath = '%VBS_PATH%'; $Shortcut.WorkingDirectory = '%~dp0\..'; $Shortcut.IconLocation = 'shell32.dll,3'; $Shortcut.Description = '本機檔案啟動器'; $Shortcut.Save()"

if exist "%SHORTCUT_PATH%" (
    echo.
    echo 成功：已設定開機自動啟動
    echo 捷徑位置：%SHORTCUT_PATH%
    echo.
    echo 下次開機時將自動啟動本機檔案啟動器
) else (
    echo.
    echo 錯誤：建立捷徑失敗
    echo 請手動將 start_hidden.vbs 加入啟動資料夾
)

pause