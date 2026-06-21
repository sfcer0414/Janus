"""
使用追蹤模組
"""
import sqlite3
import os
import json
import socket
import getpass
from datetime import datetime, timezone, timedelta
from threading import Timer
from pathlib import Path


# 全域變數
_db_path = None
_config = None
_timer = None


def init_db(db_path='data/usage.sqlite3'):
    """初始化資料庫"""
    # 確保資料夾存在
    os.makedirs(os.path.dirname(db_path), exist_ok=True)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            ts      TEXT NOT NULL,
            machine TEXT NOT NULL,
            user    TEXT NOT NULL,
            type    TEXT NOT NULL,
            path    TEXT NOT NULL,
            synced  INTEGER NOT NULL DEFAULT 0
        )
    ''')

    conn.commit()
    conn.close()


def record_event(event_type: str, path: str):
    """記錄事件到本機資料庫"""
    if not _config or not _config.get('enabled', False):
        return

    try:
        # 取得機器名稱和使用者
        machine = _config.get('machine_name') or socket.gethostname()
        user = getpass.getuser()
        ts = datetime.now(timezone.utc).isoformat()

        # 寫入資料庫
        conn = sqlite3.connect(_db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO events (ts, machine, user, type, path, synced)
            VALUES (?, ?, ?, ?, ?, 0)
        ''', (ts, machine, user, event_type, path))
        conn.commit()
        conn.close()

    except Exception as e:
        # 記錄失敗不影響主要功能
        print(f"記錄事件失敗: {e}")


def flush_to_shared():
    """將本機事件補送到共用資料夾"""
    if not _config or not _config.get('enabled', False):
        return

    try:
        shared_dir = _config.get('shared_log_dir')
        if not shared_dir:
            return

        machine = _config.get('machine_name') or socket.gethostname()
        log_file = os.path.join(shared_dir, f"{machine}.jsonl")

        # 讀取未同步的事件
        conn = sqlite3.connect(_db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT id, ts, machine, user, type, path FROM events WHERE synced = 0')
        events = cursor.fetchall()

        if events:
            # 寫入共用資料夾
            os.makedirs(shared_dir, exist_ok=True)
            with open(log_file, 'a', encoding='utf-8') as f:
                for event in events:
                    event_dict = {
                        'ts': event[1],
                        'machine': event[2],
                        'user': event[3],
                        'type': event[4],
                        'path': event[5]
                    }
                    f.write(json.dumps(event_dict, ensure_ascii=False) + '\n')

            # 標記為已同步
            event_ids = [event[0] for event in events]
            cursor.execute(f"UPDATE events SET synced = 1 WHERE id IN ({','.join('?' * len(event_ids))})", event_ids)
            conn.commit()

        # 清理舊資料
        retention_days = _config.get('retention_days', 90)
        cutoff_date = (datetime.now(timezone.utc) - timedelta(days=retention_days)).isoformat()
        cursor.execute('DELETE FROM events WHERE synced = 1 AND ts < ?', (cutoff_date,))
        conn.commit()

        conn.close()

    except Exception as e:
        # 補送失敗不影響主要功能
        print(f"補送事件失敗: {e}")


def periodic_flush():
    """定期執行補送"""
    global _timer

    flush_to_shared()

    # 設定下次執行
    interval = _config.get('flush_interval_seconds', 60)
    _timer = Timer(interval, periodic_flush)
    _timer.daemon = True
    _timer.start()


def start_background_tasks(app):
    """啟動背景任務"""
    global _db_path, _config

    config = app.config['APP_CONFIG']
    _config = config.tracking
    _db_path = 'data/usage.sqlite3'

    if _config.get('enabled', False):
        # 初始化資料庫
        init_db(_db_path)

        # 啟動定期補送
        interval = _config.get('flush_interval_seconds', 60)
        _timer = Timer(interval, periodic_flush)
        _timer.daemon = True
        _timer.start()