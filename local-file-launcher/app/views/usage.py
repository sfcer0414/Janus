"""
使用報表相關的視圖
"""
from flask import Blueprint, render_template, jsonify, request, current_app
import os
import json
from datetime import datetime, timedelta, timezone
from collections import defaultdict


bp = Blueprint('usage', __name__)


def read_jsonl_files(shared_dir):
    """
    讀取共用資料夾中所有 .jsonl 檔案

    Args:
        shared_dir: 共用資料夾路徑

    Returns:
        所有事件的列表
    """
    events = []

    if not os.path.exists(shared_dir):
        return events

    try:
        for filename in os.listdir(shared_dir):
            if filename.endswith('.jsonl'):
                file_path = os.path.join(shared_dir, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        for line in f:
                            line = line.strip()
                            if line:
                                try:
                                    event = json.loads(line)
                                    events.append(event)
                                except json.JSONDecodeError:
                                    # 跳過壞行
                                    continue
                except IOError:
                    continue

    except Exception as e:
        print(f"讀取共用資料夾失敗: {e}")

    return events


def generate_summary(events, range_days=30):
    """
    生成統計摘要

    Args:
        events: 事件列表
        range_days: 統計天數範圍

    Returns:
        統計摘要字典
    """
    # 計算日期範圍
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=range_days)

    # 過濾範圍內的事件
    filtered_events = []
    for event in events:
        try:
            event_time = datetime.fromisoformat(event['ts'].replace('Z', '+00:00'))
            if event_time >= cutoff_date:
                filtered_events.append(event)
        except (ValueError, KeyError):
            continue

    # 統計資料
    file_counts = defaultdict(int)
    browser_counts = defaultdict(int)  # 瀏覽器統計（原本的 machine 欄位現在存瀏覽器資訊）
    user_counts = defaultdict(int)
    day_counts = defaultdict(int)

    for event in filtered_events:
        # 只統計 open 事件的檔案
        if event.get('type') == 'open':
            path = event.get('path', '')
            if path and path != '/':
                file_counts[path] += 1

        # 瀏覽器統計（使用 machine 欄位）
        browser = event.get('machine', 'Unknown')
        browser_counts[browser] += 1

        # 使用者統計
        user = event.get('user', 'anonymous')
        user_counts[user] += 1

        # 每日統計
        try:
            event_time = datetime.fromisoformat(event['ts'].replace('Z', '+00:00'))
            day = event_time.strftime('%Y-%m-%d')
            day_counts[day] += 1
        except (ValueError, KeyError):
            continue

    # 整理結果
    top_files = sorted(
        [{'path': path, 'count': count} for path, count in file_counts.items()],
        key=lambda x: x['count'],
        reverse=True
    )[:10]

    by_browser = sorted(
        [{'browser': browser, 'count': count} for browser, count in browser_counts.items()],
        key=lambda x: x['count'],
        reverse=True
    )

    by_user = sorted(
        [{'user': user, 'count': count} for user, count in user_counts.items()],
        key=lambda x: x['count'],
        reverse=True
    )[:10]

    # 生成完整的日期範圍
    by_day = []
    current_date = cutoff_date
    while current_date <= datetime.now(timezone.utc):
        day_str = current_date.strftime('%Y-%m-%d')
        by_day.append({
            'date': day_str,
            'count': day_counts.get(day_str, 0)
        })
        current_date += timedelta(days=1)

    return {
        'range_days': range_days,
        'top_files': top_files,
        'by_browser': by_browser,
        'by_user': by_user,
        'by_day': by_day
    }


@bp.route('/admin/usage')
def usage_page():
    """使用報表頁面（僅本機可存取）"""
    # 檢查是否本機存取
    if request.remote_addr not in ['127.0.0.1', '::1']:
        return '禁止存取', 403

    return render_template('usage.html', title="使用報表")


@bp.route('/api/usage/summary')
def api_usage_summary():
    """API：取得使用統計摘要"""
    # 檢查是否本機存取
    if request.remote_addr not in ['127.0.0.1', '::1']:
        return jsonify({"ok": False, "error": "禁止存取"}), 403

    try:
        config = current_app.config.get('APP_CONFIG')

        # 檢查追蹤是否啟用
        if not config or not config.tracking_enabled:
            return jsonify({
                "ok": True,
                "range_days": 30,
                "top_files": [],
                "by_machine": [],
                "by_user": [],
                "by_day": [],
                "message": "追蹤功能未啟用"
            })

        # 取得共用資料夾路徑
        shared_dir = config.tracking.get('shared_log_dir')
        if not shared_dir:
            return jsonify({
                "ok": False,
                "error": "未設定共用資料夾"
            }), 500

        # 讀取所有事件
        events = read_jsonl_files(shared_dir)

        # 生成統計摘要
        range_days = int(request.args.get('days', 30))
        summary = generate_summary(events, range_days)

        return jsonify({
            "ok": True,
            **summary
        })

    except Exception as e:
        return jsonify({
            "ok": False,
            "error": f"生成報表失敗: {str(e)}"
        }), 500