"""
核心模組：與框架無關的檔案操作功能
"""
import os
import sys
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List, Any


def safe_resolve(base: str, rel: str) -> Optional[str]:
    """
    將 rel 接到 base 後正規化；確認結果等於 base 或位於 base 之下，否則回傳 None。

    Args:
        base: 基礎路徑（已正規化）
        rel: 相對路徑

    Returns:
        安全的絕對路徑，或 None（若路徑不安全）
    """
    if not base:
        return None

    # 處理空路徑
    if not rel or rel == '.':
        return base

    # 結合路徑並正規化
    try:
        combined = os.path.join(base, rel)
        resolved = os.path.abspath(os.path.realpath(combined))
        base_real = os.path.abspath(os.path.realpath(base))

        # 確認結果在 base 之下（使用路徑分隔符確保精確比對）
        if resolved == base_real:
            return resolved
        if resolved.startswith(base_real + os.sep):
            return resolved

        return None
    except (OSError, ValueError):
        return None


def list_dir(base: str, rel: str, show_hidden: bool) -> Dict[str, Any]:
    """
    列出 base/rel 內容。

    Args:
        base: 基礎路徑
        rel: 相對路徑
        show_hidden: 是否顯示隱藏檔案

    Returns:
        包含目錄內容的字典
    """
    # 解析路徑
    target_path = safe_resolve(base, rel)
    if not target_path:
        raise ValueError("路徑不合法")

    if not os.path.exists(target_path):
        raise FileNotFoundError(f"路徑不存在: {rel}")

    if not os.path.isdir(target_path):
        raise ValueError(f"不是資料夾: {rel}")

    # 計算相對路徑
    rel_path = os.path.relpath(target_path, base) if target_path != base else ""
    if rel_path == ".":
        rel_path = ""

    # 建立麵包屑
    crumbs = []
    if rel_path:
        parts = rel_path.split(os.sep)
        for i, part in enumerate(parts):
            crumb_rel = os.sep.join(parts[:i+1])
            crumbs.append({
                "name": part,
                "rel": crumb_rel.replace(os.sep, "/")  # 統一用正斜線
            })

    # 計算父路徑
    parent = ""
    if rel_path and rel_path != ".":
        parent_path = os.path.dirname(rel_path)
        if parent_path and parent_path != ".":
            parent = parent_path.replace(os.sep, "/")

    # 列出檔案和資料夾
    entries = []
    try:
        items = os.listdir(target_path)
    except PermissionError:
        raise PermissionError(f"無法存取資料夾: {rel}")

    for item in items:
        # 隱藏檔案處理
        if not show_hidden:
            if item.startswith('.'):
                continue
            if item.lower() in ['desktop.ini', 'thumbs.db']:
                continue

        item_path = os.path.join(target_path, item)

        try:
            stat = os.stat(item_path)
            is_dir = os.path.isdir(item_path)

            entry = {
                "name": item,
                "type": "dir" if is_dir else "file",
                "size": 0 if is_dir else stat.st_size,
                "mtime": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M"),
                "ext": "" if is_dir else os.path.splitext(item)[1][1:].lower()  # 去掉點號並轉小寫
            }
            entries.append(entry)
        except (OSError, PermissionError):
            # 忽略無法存取的項目
            continue

    # 排序：資料夾在前，然後按名稱（不分大小寫）
    entries.sort(key=lambda x: (x["type"] != "dir", x["name"].lower()))

    # 處理相對路徑格式（統一用正斜線）
    rel_normalized = rel_path.replace(os.sep, "/") if rel_path else ""

    return {
        "ok": True,
        "rel": rel_normalized,
        "parent": parent,
        "is_root": not bool(rel_path),
        "crumbs": crumbs,
        "entries": entries
    }


def open_file(path_abs: str) -> None:
    """
    以系統預設程式開啟檔案。

    Args:
        path_abs: 檔案的絕對路徑
    """
    if not os.path.exists(path_abs):
        raise FileNotFoundError(f"檔案不存在: {path_abs}")

    if not os.path.isfile(path_abs):
        raise ValueError(f"不是檔案: {path_abs}")

    # Windows
    if sys.platform == 'win32':
        os.startfile(path_abs)
    # macOS
    elif sys.platform == 'darwin':
        subprocess.Popen(['open', path_abs])
    # Linux/其他
    else:
        subprocess.Popen(['xdg-open', path_abs])