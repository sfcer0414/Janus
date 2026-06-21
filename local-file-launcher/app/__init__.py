"""
Flask 應用初始化模組
"""
from flask import Flask
from .config import Config
import os


def create_app(config_path='config.json'):
    """
    建立並設定 Flask 應用

    Args:
        config_path: 設定檔路徑

    Returns:
        設定完成的 Flask 應用實例
    """
    app = Flask(__name__)

    # 載入設定
    try:
        config = Config(config_path)
        app.config['APP_CONFIG'] = config
    except (FileNotFoundError, ValueError) as e:
        print(f"錯誤：{e}")
        raise

    # 檢查資料夾是否存在
    if not os.path.exists(config.folder):
        print(f"警告：指定的資料夾不存在: {config.folder}")

    # 註冊藍圖
    from .views import files, announcements, usage, track
    app.register_blueprint(files.bp)
    app.register_blueprint(announcements.bp)
    app.register_blueprint(usage.bp)
    app.register_blueprint(track.bp)

    # 啟動追蹤背景工作（如果啟用）
    if config.tracking_enabled:
        from .tracking import start_background_tasks
        start_background_tasks(app)

    return app