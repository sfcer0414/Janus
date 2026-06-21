"""
設定模組：讀取和驗證 config.json
"""
import json
import os
from pathlib import Path


class Config:
    def __init__(self, config_path='config.json'):
        """讀取和驗證設定檔"""
        self.config_path = config_path
        self._data = self._load_config()

    def _load_config(self):
        """載入設定檔並補齊預設值"""
        # 預設值
        defaults = {
            'folder': None,
            'port': 8765,
            'title': '本機檔案',
            'open_browser': True,
            'show_hidden': False,
            'tracking': {
                'enabled': False,
                'machine_name': None,
                'shared_log_dir': None,
                'flush_interval_seconds': 60,
                'retention_days': 90
            }
        }

        # 讀取設定檔
        if not os.path.exists(self.config_path):
            raise FileNotFoundError(f"設定檔不存在: {self.config_path}。請複製 config.example.json 並修改。")

        with open(self.config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)

        # 合併預設值
        result = defaults.copy()
        result.update(config)

        # 處理 tracking 區段
        if 'tracking' in config:
            result['tracking'] = defaults['tracking'].copy()
            result['tracking'].update(config['tracking'])
        else:
            result['tracking'] = {'enabled': False}

        # 驗證必要欄位
        if not result['folder']:
            raise ValueError("必須指定 folder 設定")

        # 正規化資料夾路徑
        result['folder'] = os.path.abspath(result['folder'])

        return result

    @property
    def folder(self):
        return self._data['folder']

    @property
    def port(self):
        return self._data['port']

    @property
    def title(self):
        return self._data['title']

    @property
    def open_browser(self):
        return self._data['open_browser']

    @property
    def show_hidden(self):
        return self._data['show_hidden']

    @property
    def tracking(self):
        return self._data['tracking']

    @property
    def tracking_enabled(self):
        return self._data['tracking'].get('enabled', False)