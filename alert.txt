import asyncio
import json
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import websockets  # کتابخانه websockets (pip install websockets)

from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Trade  # مدل Trade که قبلاً تعریف شده

router = APIRouter()


@router.websocket("/ws/alert")
async def trade_monitor(websocket: WebSocket):
    await websocket.accept()
    while True:
        try:
            # 1. گرفتن لیست ترید‌ها از پایگاه داده
            db: Session = next(get_db())
            trades = db.query(Trade).all()

            # 2. اتصال به وب‌سوکت خارجی برای دریافت قیمت‌های بازار
            external_ws_url = "ws://localhost:8000/ws/kline"
            min_price = float("inf")
            max_price = 0.0
            start_time = time.time()

            async with websockets.connect(external_ws_url) as ext_ws:
                while time.time() - start_time < 10:
                    try:
                        # محاسبه زمان باقی‌مانده برای تایم‌اوت دریافت پیام
                        timeout = 10 - (time.time() - start_time)
                        message = await asyncio.wait_for(ext_ws.recv(), timeout=timeout)
                        data = json.loads(message)
                        # استخراج قیمت فعلی از داده‌های دریافت شده؛ فرض می‌کنیم قیمت پایانی (c) کِلن قیمت فعلی است.
                        price = float(data.get("k", {}).get("c", 0))
                        if price:
                            min_price = min(min_price, price)
                            max_price = max(max_price, price)
                    except asyncio.TimeoutError:
                        break  # اگر در بازه زمانی انتظار پیام به تایم‌اوت رسیدیم

            # در صورت عدم دریافت هیچ پیام، min_price همچنان inf خواهد بود؛ تبدیل به None برای خروجی
            if min_price == float("inf"):
                min_price = None

            # 3. بررسی اینکه کدام تریدها به نقاط حساس (open, targetها یا stop) رسیده‌اند
            triggered_trades = []
            for trade in trades:
                triggered = {}

                # بررسی قیمت شروع (open_price)
                if min_price is not None and trade.open_price >= min_price and trade.open_price <= max_price:
                    triggered["open_price"] = trade.open_price

                # بررسی تارگت اول
                if trade.target_1_price is not None and min_price is not None and trade.target_1_price >= min_price and trade.target_1_price <= max_price:
                    triggered["target_1_price"] = trade.target_1_price

                # بررسی تارگت دوم
                if trade.target_2_price is not None and min_price is not None and trade.target_2_price >= min_price and trade.target_2_price <= max_price:
                    triggered["target_2_price"] = trade.target_2_price

                # بررسی تارگت سوم
                if trade.target_3_price is not None and min_price is not None and trade.target_3_price >= min_price and trade.target_3_price <= max_price:
                    triggered["target_3_price"] = trade.target_3_price

                # بررسی استاپ
                if min_price is not None and trade.stop_price >= min_price and trade.stop_price <= max_price:
                    triggered["stop_price"] = trade.stop_price

                if triggered:
                    triggered_trades.append({
                        "id": trade.id,
                        "symbol_id": trade.symbol_id,
                        "triggered": triggered
                    })

            # 4. ارسال نتایج به کلاینت
            result = {
                "min_price": min_price,
                "max_price": max_price,
                "trades_triggered": triggered_trades
            }
            await websocket.send_json(result)

        except WebSocketDisconnect:
            break
        except Exception as e:
            await websocket.send_json({"error": str(e)})
