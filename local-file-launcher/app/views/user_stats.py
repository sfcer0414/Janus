"""
個別使用者統計視圖
"""
from flask import Blueprint, render_template, jsonify, request, current_app
from .auth import login_required
import os
import json
from datetime import datetime, timedelta, timezone
from collections import defaultdict, Counter
import calendar


bp = Blueprint('user_stats', __name__)


def parse_event_time(ts):
    """解析事件時間"""
    try:
        # 處理不同的時間格式
        if 'T' in ts:
            return datetime.fromisoformat(ts.replace('Z', '+00:00'))
        return datetime.fromisoformat(ts)
    except:
        return None


def calculate_user_stats(events, username, period='month'):
    """計算特定使用者的統計數據"""
    now = datetime.now(timezone.utc)

    # 決定時間範圍
    if period == 'week':
        days = 7
        period_label = '本週'
    else:  # month
        days = 30
        period_label = '本月'

    cutoff_date = now - timedelta(days=days)

    # 過濾使用者和時間範圍內的事件
    user_events = []
    for event in events:
        if event.get('user') != username:
            continue

        event_time = parse_event_time(event.get('ts', ''))
        if event_time and event_time >= cutoff_date:
            user_events.append({
                **event,
                'datetime': event_time
            })

    # 統計數據
    stats = {
        'username': username,
        'period': period,
        'period_label': period_label,
        'total_events': len(user_events),
        'total_opens': 0,
        'total_views': 0,
        'daily_usage': [],
        'hourly_usage': [0] * 24,
        'file_ranking': [],
        'file_types': {},
        'weekly_summary': [],
        'efficiency_metrics': {}
    }

    # 計算各項統計
    file_opens = defaultdict(int)
    daily_counts = defaultdict(int)
    file_extensions = Counter()

    for event in user_events:
        event_type = event.get('type', '')
        event_time = event['datetime']

        # 計算開檔次數
        if event_type == 'open':
            stats['total_opens'] += 1
            path = event.get('path', '')
            if path and path != '/':
                file_opens[path] += 1
                # 統計副檔名
                if '.' in path:
                    ext = path.rsplit('.', 1)[1].lower()
                    file_extensions[ext] += 1

        # 計算瀏覽次數
        elif event_type in ['list', 'view']:
            stats['total_views'] += 1

        # 每日統計
        day_str = event_time.strftime('%Y-%m-%d')
        daily_counts[day_str] += 1

        # 小時統計
        hour = event_time.hour
        stats['hourly_usage'][hour] += 1

    # 整理檔案排名（前10）
    stats['file_ranking'] = [
        {'path': path, 'count': count}
        for path, count in sorted(file_opens.items(), key=lambda x: x[1], reverse=True)[:10]
    ]

    # 整理檔案類型統計
    stats['file_types'] = dict(file_extensions.most_common(5))

    # 生成每日使用趨勢
    current_date = cutoff_date
    while current_date <= now:
        day_str = current_date.strftime('%Y-%m-%d')
        stats['daily_usage'].append({
            'date': day_str,
            'count': daily_counts.get(day_str, 0)
        })
        current_date += timedelta(days=1)

    # 計算每週摘要（最近4週）
    if period == 'month':
        for week_offset in range(4):
            week_start = now - timedelta(days=(week_offset + 1) * 7)
            week_end = now - timedelta(days=week_offset * 7)

            week_events = [e for e in user_events
                          if week_start <= e['datetime'] < week_end]

            week_opens = sum(1 for e in week_events if e.get('type') == 'open')

            stats['weekly_summary'].append({
                'week': f'第{4-week_offset}週',
                'opens': week_opens,
                'total': len(week_events)
            })

    # 計算效益指標
    # 假設每次開檔節省30秒的搜尋時間
    time_saved_minutes = (stats['total_opens'] * 30) / 60
    stats['efficiency_metrics'] = {
        'time_saved': f'{time_saved_minutes:.1f} 分鐘',
        'avg_daily_usage': f"{len(user_events) / max(days, 1):.1f}",
        'productivity_score': min(100, int(stats['total_opens'] * 2.5)),  # 簡單的生產力分數
        'most_active_hour': max(range(24), key=lambda h: stats['hourly_usage'][h]) if any(stats['hourly_usage']) else 0
    }

    return stats


def read_all_events(shared_dir):
    """讀取所有事件"""
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
                                    continue
                except IOError:
                    continue
    except Exception as e:
        print(f"讀取事件失敗: {e}")

    return events


def get_all_users(events):
    """取得所有使用者列表"""
    users = set()
    for event in events:
        user = event.get('user')
        if user and user != 'anonymous':
            users.add(user)
    return sorted(list(users))


@bp.route('/admin/user-stats')
@login_required
def user_stats_page():
    """個別使用者統計頁面（管理員功能）"""
    # 檢查是否本機存取
    if request.remote_addr not in ['127.0.0.1', '::1']:
        return '禁止存取', 403
    return render_template('user_stats.html', title="使用者統計")


@bp.route('/api/admin/user-stats/users')
@login_required
def api_get_users():
    """API：取得所有使用者列表（管理員功能）"""
    # 檢查是否本機存取
    if request.remote_addr not in ['127.0.0.1', '::1']:
        return jsonify({"ok": False, "error": "禁止存取"}), 403
    try:
        config = current_app.config.get('APP_CONFIG')

        if not config or not config.tracking_enabled:
            return jsonify({
                "ok": True,
                "users": [],
                "message": "追蹤功能未啟用"
            })

        shared_dir = config.tracking.get('shared_log_dir')
        if not shared_dir:
            return jsonify({
                "ok": False,
                "error": "未設定共用資料夾"
            }), 500

        # 讀取所有事件
        events = read_all_events(shared_dir)

        # 取得使用者列表
        users = get_all_users(events)

        # 取得當前登入的使用者
        current_user = request.cookies.get('username')

        return jsonify({
            "ok": True,
            "users": users,
            "current_user": current_user,
            "total": len(users)
        })

    except Exception as e:
        return jsonify({
            "ok": False,
            "error": f"取得使用者列表失敗: {str(e)}"
        }), 500


@bp.route('/api/admin/user-stats/details')
@login_required
def api_user_stats():
    """API：取得特定使用者的統計數據（管理員功能）"""
    # 檢查是否本機存取
    if request.remote_addr not in ['127.0.0.1', '::1']:
        return jsonify({"ok": False, "error": "禁止存取"}), 403
    try:
        username = request.args.get('user')
        period = request.args.get('period', 'month')  # week or month

        if not username:
            return jsonify({
                "ok": False,
                "error": "請指定使用者"
            }), 400

        config = current_app.config.get('APP_CONFIG')

        if not config or not config.tracking_enabled:
            return jsonify({
                "ok": True,
                "stats": {
                    "username": username,
                    "period": period,
                    "total_events": 0,
                    "message": "追蹤功能未啟用"
                }
            })

        shared_dir = config.tracking.get('shared_log_dir')
        if not shared_dir:
            return jsonify({
                "ok": False,
                "error": "未設定共用資料夾"
            }), 500

        # 讀取所有事件
        events = read_all_events(shared_dir)

        # 計算統計
        stats = calculate_user_stats(events, username, period)

        return jsonify({
            "ok": True,
            "stats": stats
        })

    except Exception as e:
        return jsonify({
            "ok": False,
            "error": f"取得統計失敗: {str(e)}"
        }), 500


@bp.route('/api/admin/user-stats/comparison')
@login_required
def api_user_comparison():
    """API：比較多個使用者的統計（管理員功能）"""
    # 檢查是否本機存取
    if request.remote_addr not in ['127.0.0.1', '::1']:
        return jsonify({"ok": False, "error": "禁止存取"}), 403
    try:
        config = current_app.config.get('APP_CONFIG')

        if not config or not config.tracking_enabled:
            return jsonify({
                "ok": True,
                "comparison": [],
                "message": "追蹤功能未啟用"
            })

        shared_dir = config.tracking.get('shared_log_dir')
        if not shared_dir:
            return jsonify({
                "ok": False,
                "error": "未設定共用資料夾"
            }), 500

        # 讀取所有事件
        events = read_all_events(shared_dir)
        users = get_all_users(events)

        # 計算每個使用者的簡單統計
        comparison = []
        for user in users:
            user_stats = calculate_user_stats(events, user, 'month')
            comparison.append({
                'user': user,
                'total_opens': user_stats['total_opens'],
                'total_events': user_stats['total_events'],
                'productivity_score': user_stats['efficiency_metrics']['productivity_score']
            })

        # 排序（按生產力分數）
        comparison.sort(key=lambda x: x['productivity_score'], reverse=True)

        return jsonify({
            "ok": True,
            "comparison": comparison
        })

    except Exception as e:
        return jsonify({
            "ok": False,
            "error": f"比較失敗: {str(e)}"
        }), 500