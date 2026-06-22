"""
認證相關的視圖
"""
from flask import Blueprint, render_template, request, jsonify, make_response, redirect, url_for
from functools import wraps
import json


bp = Blueprint('auth', __name__)


def login_required(f):
    """裝飾器：檢查使用者是否已登入"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        username = request.cookies.get('username')
        if not username:
            if request.path.startswith('/api/'):
                return jsonify({"ok": False, "error": "未登入"}), 401
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function


@bp.route('/login')
def login():
    """登入頁面"""
    # 如果已登入，重導向到首頁
    if request.cookies.get('username'):
        return redirect(url_for('files.index'))
    return render_template('login.html', title="登入")


@bp.route('/api/login', methods=['POST'])
def api_login():
    """API：處理登入請求"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()

        if not username:
            return jsonify({
                "ok": False,
                "error": "請輸入使用者名稱"
            }), 400

        # 驗證名稱長度
        if len(username) < 2 or len(username) > 20:
            return jsonify({
                "ok": False,
                "error": "使用者名稱長度必須在 2-20 個字元之間"
            }), 400

        # 建立回應並設定 cookie
        response = make_response(jsonify({
            "ok": True,
            "username": username,
            "message": f"歡迎，{username}！"
        }))

        # 設定 cookie（30天有效期）
        response.set_cookie(
            'username',
            username,
            max_age=30*24*60*60,  # 30天
            httponly=True,
            samesite='Lax'
        )

        # 記錄登入事件
        try:
            from ..tracking import record_event_with_user
            record_event_with_user('login', '/', username)
        except:
            pass  # 記錄失敗不影響登入

        return response

    except Exception as e:
        return jsonify({
            "ok": False,
            "error": f"登入失敗: {str(e)}"
        }), 500


@bp.route('/api/logout', methods=['POST'])
def api_logout():
    """API：處理登出請求"""
    username = request.cookies.get('username')

    # 記錄登出事件
    if username:
        try:
            from ..tracking import record_event_with_user
            record_event_with_user('logout', '/', username)
        except:
            pass

    # 建立回應並清除 cookie
    response = make_response(jsonify({
        "ok": True,
        "message": "已成功登出"
    }))

    response.set_cookie(
        'username',
        '',
        max_age=0,
        httponly=True,
        samesite='Lax'
    )

    return response


@bp.route('/api/current-user')
def api_current_user():
    """API：取得當前登入的使用者"""
    username = request.cookies.get('username')

    if username:
        return jsonify({
            "ok": True,
            "username": username,
            "logged_in": True
        })
    else:
        return jsonify({
            "ok": True,
            "username": None,
            "logged_in": False
        })