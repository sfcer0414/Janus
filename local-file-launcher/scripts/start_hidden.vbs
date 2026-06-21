' 背景執行本機檔案啟動器
Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' 取得腳本所在目錄
strPath = objFSO.GetParentFolderName(WScript.ScriptFullName)
strProjectRoot = objFSO.GetParentFolderName(strPath)

' 切換工作目錄
objShell.CurrentDirectory = strProjectRoot

' 檢查設定檔
If Not objFSO.FileExists(strProjectRoot & "\config.json") Then
    MsgBox "錯誤：找不到 config.json" & vbCrLf & "請複製 config.example.json 並修改設定", vbCritical, "本機檔案啟動器"
    WScript.Quit 1
End If

' 使用 pythonw 背景執行（無視窗）
objShell.Run "pythonw run.py", 0, False

' 提示已啟動
MsgBox "本機檔案啟動器已在背景啟動" & vbCrLf & "請開啟瀏覽器存取 http://127.0.0.1:8765", vbInformation, "本機檔案啟動器"