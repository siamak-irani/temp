import asyncio
import json
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import websockets 

from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Trade
from app.events.trade_events import trade_event_manager, TradeEvent

router = APIRouter()


# @router.websocket("/ws/alert")
# async def trade_monitor(websocket: WebSocket):
#     await websocket.accept()

#     db: Session = next(get_db())
#     trades = db.query(Trade).all()

#     async def update_trades_list(event: TradeEvent):
#         nonlocal trades
#         if event.action == "create":
#             trades.append(event.trade)
#         elif event.action == "update":
#             for idx, trade in enumerate(trades):
#                 if trade.id == event.trade.id:
#                     trades[idx] = event.trade
#                     break
#         elif event.action == "delete":
#             trades = [trade for trade in trades if trade.id != event.trade.id]

#     trade_event_manager.subscribe(update_trades_list)

#     while True:
#         try:
#             external_ws_url = "ws://localhost:8000/ws/kline"
#             min_price = float("inf")
#             max_price = 0.0
#             start_time = time.time()

#             async with websockets.connect(external_ws_url) as ext_ws:
#                 while time.time() - start_time < 10:
#                     try:
#                         timeout = 10 - (time.time() - start_time)
#                         message = await asyncio.wait_for(ext_ws.recv(), timeout=timeout)
#                         data = json.loads(message)
#                         price = float(data.get("k", {}).get("c", 0))
#                         if price:
#                             min_price = min(min_price, price)
#                             max_price = max(max_price, price)
#                     except asyncio.TimeoutError:
#                         break  


#             if min_price == float("inf"):
#                 min_price = None


#             triggered_trades = []
#             for trade in trades:
#                 triggered = {}

#                 if (
#                     min_price is not None
#                     and trade.open_price >= min_price
#                     and trade.open_price <= max_price
#                 ):
#                     triggered["open_price"] = trade.open_price

    
#                 if (
#                     trade.target_1_price is not None
#                     and min_price is not None
#                     and trade.target_1_price >= min_price
#                     and trade.target_1_price <= max_price
#                 ):
#                     triggered["target_1_price"] = trade.target_1_price

#                 if (
#                     trade.target_2_price is not None
#                     and min_price is not None
#                     and trade.target_2_price >= min_price
#                     and trade.target_2_price <= max_price
#                 ):
#                     triggered["target_2_price"] = trade.target_2_price

 
#                 if (
#                     trade.target_3_price is not None
#                     and min_price is not None
#                     and trade.target_3_price >= min_price
#                     and trade.target_3_price <= max_price
#                 ):
#                     triggered["target_3_price"] = trade.target_3_price


#                 if (
#                     min_price is not None
#                     and trade.stop_price >= min_price
#                     and trade.stop_price <= max_price
#                 ):
#                     triggered["stop_price"] = trade.stop_price

#                 if triggered:
#                     triggered_trades.append(
#                         {
#                             "id": trade.id,
#                             "symbol_id": trade.symbol_id,
#                             "triggered": triggered,
#                         }
#                     )


#             result = {
#                 "min_price": min_price,
#                 "max_price": max_price,
#                 "trades_triggered": triggered_trades,
#             }
#             await websocket.send_json(result)

#         except WebSocketDisconnect:
#             break
#         except Exception as e:
#             await websocket.send_json({"error": str(e)})


@router.websocket("/ws/alert")
async def trade_monitor(websocket: WebSocket):
    await websocket.accept()

    db: Session = next(get_db())
    trades = db.query(Trade).all()

    async def update_trades_list(event: TradeEvent):
        nonlocal trades
        if event.action == "create":
            trades.append(event.trade)
        elif event.action == "update":
            for idx, trade in enumerate(trades):
                if trade.id == event.trade.id:
                    trades[idx] = event.trade
                    break
        elif event.action == "delete":
            trades = [trade for trade in trades if trade.id != event.trade.id]

    trade_event_manager.subscribe(update_trades_list)

    while True:
        try:
            external_ws_url = "ws://localhost:8000/ws/kline"
            min_price = float("inf")
            max_price = 0.0
            start_time = time.time()

            async with websockets.connect(external_ws_url) as ext_ws:
                while time.time() - start_time < 10:
                    try:
                        timeout = 10 - (time.time() - start_time)
                        message = await asyncio.wait_for(ext_ws.recv(), timeout=timeout)
                        data = json.loads(message)
                        price = float(data.get("k", {}).get("c", 0))
                        if price:
                            min_price = min(min_price, price)
                            max_price = max(max_price, price)
                    except asyncio.TimeoutError:
                        break  

            if min_price == float("inf"):
                min_price = None

            triggered_trades = []
            for trade in trades:
                triggered = {}

                if (
                    min_price is not None
                    and trade.open_price >= min_price
                    and trade.open_price <= max_price
                ):
                    triggered["open_price"] = trade.open_price

                if (
                    trade.target_1_price is not None
                    and min_price is not None
                    and trade.target_1_price >= min_price
                    and trade.target_1_price <= max_price
                ):
                    triggered["target_1_price"] = trade.target_1_price

                if (
                    trade.target_2_price is not None
                    and min_price is not None
                    and trade.target_2_price >= min_price
                    and trade.target_2_price <= max_price
                ):
                    triggered["target_2_price"] = trade.target_2_price

                if (
                    trade.target_3_price is not None
                    and min_price is not None
                    and trade.target_3_price >= min_price
                    and trade.target_3_price <= max_price
                ):
                    triggered["target_3_price"] = trade.target_3_price

                if (
                    min_price is not None
                    and trade.stop_price >= min_price
                    and trade.stop_price <= max_price
                ):
                    triggered["stop_price"] = trade.stop_price

                if triggered:
                    triggered_trades.append(
                        {
                            "id": trade.id,
                            "symbol_id": trade.symbol_id,
                            "triggered": triggered,
                        }
                    )

            # ارسال پیام تنها در صورت وجود تریدهای trigger شده
            if triggered_trades:
                result = {
                    "min_price": min_price,
                    "max_price": max_price,
                    "trades_triggered": triggered_trades,
                }
                await websocket.send_json(result)

        except WebSocketDisconnect:
            break
        except Exception as e:
            await websocket.send_json({"error": str(e)})
