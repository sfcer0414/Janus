"""
檔案清單和開檔相關的視圖
"""
from flask import Blueprint, render_template, request, jsonify, current_app
from ..core import list_dir, open_file, safe_resolve
import os


bp = Blueprint('files', __name__)


@bp.route('/')
def index():
    """首頁：顯示檔案清單"""
    config = current_app.config['APP_CONFIG']

    # 嘗試載入根目錄內容
    try:
        data = list_dir(config.folder, "", config.show_hidden)
    except Exception as e:
        data = {
            "ok": False,
            "error": str(e),
            "rel": "",
            "entries": []
        }

    return render_template('files.html',
                         title=config.title,
                         data=data)


@bp.route('/api/list')
def api_list():
    """API：列出指定目錄內容"""
    config = current_app.config['APP_CONFIG']
    rel = request.args.get('rel', '')

    try:
        # 驗證基礎資料夾
        if not os.path.exists(config.folder):
            return jsonify({
                "ok": False,
                "error": f"基礎資料夾不存在: {config.folder}"
            }), 400

        # 列出目錄
        result = list_dir(config.folder, rel, config.show_hidden)

        # 記錄事件（如果追蹤啟用）
        if config.tracking_enabled:
            from ..tracking import record_event
            record_event('list', rel or '/')

        return jsonify(result)

    except ValueError as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except FileNotFoundError as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    except PermissionError as e:
        return jsonify({"ok": False, "error": str(e)}), 403
    except Exception as e:
        return jsonify({"ok": False, "error": f"內部錯誤: {str(e)}"}), 500


@bp.route('/api/open', methods=['POST'])
def api_open():
    """API：開啟檔案"""
    config = current_app.config['APP_CONFIG']

    try:
        # 取得請求資料
        data = request.get_json()
        if not data or 'rel' not in data:
            return jsonify({"ok": False, "error": "缺少 rel 參數"}), 400

        rel = data['rel']

        # 解析並驗證路徑
        file_path = safe_resolve(config.folder, rel)
        if not file_path:
            return jsonify({"ok": False, "error": "路徑不合法"}), 400

        # 確認是檔案
        if not os.path.exists(file_path):
            return jsonify({"ok": False, "error": "檔案不存在"}), 400

        if not os.path.isfile(file_path):
            return jsonify({"ok": False, "error": "不是檔案"}), 400

        # 開啟檔案
        open_file(file_path)

        # 記錄事件
        if config.tracking_enabled:
            from ..tracking import record_event
            record_event('open', rel)

        # 回傳成功
        file_name = os.path.basename(file_path)
        return jsonify({"ok": True, "name": file_name})

    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500