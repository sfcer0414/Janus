"""
追蹤相關的視圖
"""
from flask import Blueprint, request, jsonify, current_app


bp = Blueprint('track', __name__)


@bp.route('/api/track', methods=['POST'])
def api_track():
    """API：記錄前端事件"""
    config = current_app.config['APP_CONFIG']

    if not config.tracking_enabled:
        return jsonify({"ok": True, "message": "追蹤已停用"})

    try:
        data = request.get_json()
        if not data:
            return jsonify({"ok": False, "error": "缺少資料"}), 400

        # 暫時只回傳成功
        return jsonify({"ok": True})

    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500