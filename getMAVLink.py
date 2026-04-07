import asyncio
import os
import json
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pymavlink import mavutil
import aiomysql
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_CONFIG = {
    'host': os.getenv('DB_HOST', '127.0.0.1'),
    'port': int(os.getenv('DB_PORT', 3306)),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', 'password'),
    'db': os.getenv('DB_NAME', 'mavlink_db'),
    'autocommit': True
}

MAV_PORT = os.getenv('MAV_PORT', '14551')
MAV_HOST = os.getenv('MAV_HOST', '0.0.0.0') # 0.0.0.0 表示接收所有來源
MAV_CONNECTION_STRING = f"udpin:{MAV_HOST}:{MAV_PORT}"

# 記憶體內快取的當前狀態
current_telemetry = {
    "lat": 0, "lon": 0, "alt": 0, "ground_speed": 0, 
    "heading": 0, "pitch": 0, "roll": 0, "battery_voltage": 0, "gps_fix_type": 0,
    "armed": False, "mode": "UNKNOWN"
}

connected_clients = set()

pool_global = None
async def connect_db():
    global pool_global
    try:
        pool_global = await aiomysql.create_pool(**DB_CONFIG)
        return pool_global
    except Exception as e:
        print(f"Simulation Mode: DB skipped ({e})")
        return None

async def mavlink_listener():
    try:
        master = mavutil.mavlink_connection(MAV_CONNECTION_STRING)
        print(f"Listening for MAVLink on {MAV_CONNECTION_STRING}")
        
        while True:
            # 非阻塞方式接收
            msg = master.recv_match(type=['GLOBAL_POSITION_INT', 'VFR_HUD', 'ATTITUDE', 'SYS_STATUS', 'GPS_RAW_INT', 'HEARTBEAT'], blocking=False)
            if not msg:
                await asyncio.sleep(0.01)
                continue
                
            msg_type = msg.get_type()
            
            if msg_type == 'GLOBAL_POSITION_INT':
                current_telemetry['lat'] = msg.lat / 1e7
                current_telemetry['lon'] = msg.lon / 1e7
                current_telemetry['alt'] = msg.alt / 1000.0    
                current_telemetry['heading'] = msg.hdg / 100.0
            elif msg_type == 'VFR_HUD':
                current_telemetry['ground_speed'] = msg.groundspeed
            elif msg_type == 'ATTITUDE':
                current_telemetry['pitch'] = msg.pitch
                current_telemetry['roll'] = msg.roll
            elif msg_type == 'SYS_STATUS':
                current_telemetry['battery_voltage'] = msg.voltage_battery / 1000.0
            elif msg_type == 'GPS_RAW_INT':
                current_telemetry['gps_fix_type'] = msg.fix_type
            elif msg_type == 'HEARTBEAT':
                current_telemetry['armed'] = (msg.base_mode & mavutil.mavlink.MAV_MODE_FLAG_SAFETY_ARMED) != 0
                current_telemetry['mode'] = mavutil.mode_string_v10(msg)

            # 透過 WS 廣播到所有前端
            if connected_clients:
                payload = json.dumps(current_telemetry)
                for client in connected_clients.copy():
                    try:
                        await client.send_text(payload)
                    except Exception:
                        connected_clients.remove(client)

    except Exception as e:
        print(f"MAVLink Error: {e}")

async def db_writer(pool):
    while True:
        await asyncio.sleep(1.0) # 每秒寫入一次
        if not pool: continue
        if current_telemetry['lat'] != 0 and current_telemetry['lon'] != 0:
            async with pool.acquire() as conn:
                async with conn.cursor() as cur:
                    await cur.execute("""
                        INSERT INTO telemetry_logs 
                        (lat, lon, alt, ground_speed, heading, pitch, roll, battery_voltage, gps_fix_type)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        current_telemetry['lat'], current_telemetry['lon'], current_telemetry['alt'], 
                        current_telemetry['ground_speed'], current_telemetry['heading'], 
                        current_telemetry['pitch'], current_telemetry['roll'],
                        current_telemetry['battery_voltage'], current_telemetry['gps_fix_type']
                    ))

@app.on_event("startup")
async def startup_event():
    pool = await connect_db()
    asyncio.create_task(mavlink_listener())
    asyncio.create_task(db_writer(pool))

@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)
    try:
        while True:
            await websocket.receive_text() # keep-alive
    except WebSocketDisconnect:
        connected_clients.remove(websocket)

@app.get("/api/logs")
async def get_recent_logs():
    global pool_global
    if not pool_global:
        return [{"id": 1, "timestamp": datetime.now().isoformat(), "lat": 25.033, "lon": 121.565, "alt": 100, "ground_speed": 15}]
    async with pool_global.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute("SELECT * FROM telemetry_logs ORDER BY id DESC LIMIT 10")
            result = await cur.fetchall()
            # 修正 datetime 序列化
            for row in result:
                row['timestamp'] = row['timestamp'].isoformat()
            return result