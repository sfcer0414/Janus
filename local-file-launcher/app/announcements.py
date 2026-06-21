"""
公告模組：讀取和管理公告資料
"""
import json
import os
from typing import List, Dict, Any


class AnnouncementManager:
    def __init__(self, announcements_file='data/announcements.json'):
        """
        初始化公告管理器

        Args:
            announcements_file: 公告資料檔案路徑
        """
        self.announcements_file = announcements_file

    def get_announcements(self) -> List[Dict[str, Any]]:
        """
        讀取所有公告

        Returns:
            公告列表，每個公告包含 title, date, body
        """
        if not os.path.exists(self.announcements_file):
            return []

        try:
            with open(self.announcements_file, 'r', encoding='utf-8') as f:
                announcements = json.load(f)

            # 確保是列表
            if not isinstance(announcements, list):
                return []

            # 驗證並清理資料
            valid_announcements = []
            for announcement in announcements:
                if isinstance(announcement, dict) and all(
                    key in announcement for key in ['title', 'date', 'body']
                ):
                    valid_announcements.append({
                        'title': str(announcement['title']),
                        'date': str(announcement['date']),
                        'body': str(announcement['body'])
                    })

            # 按日期排序（新的在前）
            valid_announcements.sort(key=lambda x: x['date'], reverse=True)

            return valid_announcements

        except (json.JSONDecodeError, IOError) as e:
            print(f"讀取公告失敗: {e}")
            return []

    def get_latest_announcements(self, limit=5) -> List[Dict[str, Any]]:
        """
        取得最新的幾則公告

        Args:
            limit: 最大數量

        Returns:
            最新公告列表
        """
        announcements = self.get_announcements()
        return announcements[:limit]

    def get_announcement_count(self) -> int:
        """
        取得公告數量

        Returns:
            公告總數
        """
        return len(self.get_announcements())

    def add_announcement(self, title: str, date: str, body: str) -> bool:
        """
        新增公告（管理功能，選配）

        Args:
            title: 標題
            date: 日期 (YYYY-MM-DD)
            body: 內容

        Returns:
            是否成功
        """
        try:
            announcements = self.get_announcements()

            new_announcement = {
                'title': title,
                'date': date,
                'body': body
            }

            announcements.append(new_announcement)
            announcements.sort(key=lambda x: x['date'], reverse=True)

            # 確保目錄存在
            os.makedirs(os.path.dirname(self.announcements_file), exist_ok=True)

            # 寫入檔案
            with open(self.announcements_file, 'w', encoding='utf-8') as f:
                json.dump(announcements, f, ensure_ascii=False, indent=2)

            return True

        except Exception as e:
            print(f"新增公告失敗: {e}")
            return False

    def remove_announcement(self, index: int) -> bool:
        """
        移除公告（管理功能，選配）

        Args:
            index: 公告索引

        Returns:
            是否成功
        """
        try:
            announcements = self.get_announcements()

            if 0 <= index < len(announcements):
                del announcements[index]

                with open(self.announcements_file, 'w', encoding='utf-8') as f:
                    json.dump(announcements, f, ensure_ascii=False, indent=2)

                return True

            return False

        except Exception as e:
            print(f"移除公告失敗: {e}")
            return False


# 全域實例
_manager = None


def get_manager() -> AnnouncementManager:
    """取得公告管理器的全域實例"""
    global _manager
    if _manager is None:
        _manager = AnnouncementManager()
    return _manager