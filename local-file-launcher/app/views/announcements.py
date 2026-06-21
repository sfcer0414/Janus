"""
公告相關的視圖
"""
from flask import Blueprint, render_template, jsonify, current_app
from ..announcements import get_manager


bp = Blueprint('announcements', __name__)


@bp.route('/announcements')
def announcements_page():
    """公告頁面"""
    manager = get_manager()
    announcements = manager.get_announcements()

    # 記錄瀏覽事件
    config = current_app.config.get('APP_CONFIG')
    if config and config.tracking_enabled:
        from ..tracking import record_event
        record_event('view', 'announcements')

    return render_template('announcements.html',
                         title="公告",
                         announcements=announcements)


@bp.route('/api/announcements')
def api_announcements():
    """API：取得公告列表"""
    try:
        manager = get_manager()
        announcements = manager.get_announcements()

        # 記錄瀏覽事件
        config = current_app.config.get('APP_CONFIG')
        if config and config.tracking_enabled:
            from ..tracking import record_event
            record_event('view', 'announcements')

        return jsonify({
            "ok": True,
            "items": announcements
        })

    except Exception as e:
        return jsonify({
            "ok": False,
            "error": str(e)
        }), 500