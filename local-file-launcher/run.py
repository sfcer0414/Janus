#!/usr/bin/env python
"""
本機檔案啟動器 - 主程式進入點
"""
import os
import sys
import socket
import webbrowser
import time
from app import create_app


def find_available_port(start_port=8765, max_attempts=100):
    """
    尋找可用的連接埠

    Args:
        start_port: 起始連接埠
        max_attempts: 最大嘗試次數

    Returns:
        可用的連接埠號碼
    """
    for i in range(max_attempts):
        port = start_port + i
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            sock.bind(('127.0.0.1', port))
            sock.close()
            return port
        except OSError:
            continue
    raise RuntimeError(f"無法找到可用的連接埠（已嘗試 {start_port} 到 {start_port + max_attempts - 1}）")


def main():
    """主程式"""
    try:
        # 建立應用程式
        app = create_app()
        config = app.config['APP_CONFIG']

        # 尋找可用連接埠
        port = find_available_port(config.port)

        if port != config.port:
            print(f"連接埠 {config.port} 已被佔用，改用 {port}")

        # 顯示啟動訊息
        print(f"""
========================================
本機檔案啟動器
========================================
標題: {config.title}
資料夾: {config.folder}
網址: http://127.0.0.1:{port}
追蹤: {'啟用' if config.tracking_enabled else '停用'}
========================================
按 Ctrl+C 停止服務
""")

        # 開啟瀏覽器（如果設定為自動開啟）
        if config.open_browser:
            def open_browser():
                time.sleep(1)  # 等待伺服器啟動
                webbrowser.open(f'http://127.0.0.1:{port}')

            import threading
            threading.Thread(target=open_browser).start()

        # 啟動伺服器
        app.run(
            host='127.0.0.1',
            port=port,
            debug=False,  # 生產環境設為 False
            use_reloader=False  # 避免重複開啟瀏覽器
        )

    except FileNotFoundError as e:
        print(f"\n錯誤: {e}")
        print("\n請建立 config.json 檔案。可參考 config.example.json")
        sys.exit(1)
    except ValueError as e:
        print(f"\n設定錯誤: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n服務已停止")
        sys.exit(0)
    except Exception as e:
        print(f"\n未預期的錯誤: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()