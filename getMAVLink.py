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
    "armed": False, "mode": "UNKNOWN", "satellites_visible": 0, "hdop": 0.0,
    "target_lat": 0, "target_lon": 0, "wp_num": 0,
    "mission": []
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

force_mission_refresh = False

async def mavlink_listener():
    global force_mission_refresh
    import time
    try:
        master = mavutil.mavlink_connection(MAV_CONNECTION_STRING)
        print(f"Listening for MAVLink on {MAV_CONNECTION_STRING}")
        
        mission_state = 'IDLE'
        mission_count = 0
        mission_items = []
        last_req_time = 0

        while True:
            msg = master.recv_match(
                type=['GLOBAL_POSITION_INT', 'VFR_HUD', 'ATTITUDE', 'SYS_STATUS', 
                      'GPS_RAW_INT', 'HEARTBEAT', 'POSITION_TARGET_GLOBAL_INT', 
                      'MISSION_CURRENT', 'MISSION_COUNT', 'MISSION_ITEM_INT', 'MISSION_ITEM'], 
                blocking=False
            )
            
            if force_mission_refresh:
                mission_state = 'IDLE'
                mission_items = []
                force_mission_refresh = False
                
            # Mission retry mechanism (resend request if timeout after 2 seconds)
            now = time.time()
            if mission_state in ['REQ_LIST', 'FETCHING'] and (now - last_req_time) > 2.0:
                if mission_state == 'REQ_LIST':
                    master.waypoint_request_list_send()
                elif mission_state == 'FETCHING' and len(mission_items) < mission_count:
                    master.waypoint_request_send(len(mission_items))
                last_req_time = now

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
                raw_voltage = msg.voltage_battery / 1000.0
                if current_telemetry['battery_voltage'] == 0:
                    current_telemetry['battery_voltage'] = raw_voltage
                else:
                    # 使用低通濾波器來平滑電壓跳動 (0.05 權重)
                    current_telemetry['battery_voltage'] = 0.95 * current_telemetry['battery_voltage'] + 0.05 * raw_voltage
            elif msg_type == 'GPS_RAW_INT':
                current_telemetry['gps_fix_type'] = msg.fix_type
                current_telemetry['satellites_visible'] = getattr(msg, 'satellites_visible', 0)
                current_telemetry['hdop'] = getattr(msg, 'eph', 0) / 100.0
            elif msg_type == 'HEARTBEAT':
                current_telemetry['armed'] = (msg.base_mode & mavutil.mavlink.MAV_MODE_FLAG_SAFETY_ARMED) != 0
                current_telemetry['mode'] = mavutil.mode_string_v10(msg)
                
                # If connected and mission not downloaded, request it
                if mission_state == 'IDLE':
                    master.waypoint_request_list_send()
                    mission_state = 'REQ_LIST'
                    last_req_time = time.time()
                    
            elif msg_type == 'MISSION_COUNT':
                mission_count = msg.count
                mission_items = []
                if mission_count > 0:
                    mission_state = 'FETCHING'
                    master.waypoint_request_send(0)
                    last_req_time = time.time()
                else:
                    mission_state = 'DONE'
                    current_telemetry['mission'] = []
                    
            elif msg_type in ['MISSION_ITEM_INT', 'MISSION_ITEM']:
                if mission_state == 'FETCHING' and msg.seq == len(mission_items):
                    lat = msg.x / 1e7 if msg_type == 'MISSION_ITEM_INT' else msg.x
                    lon = msg.y / 1e7 if msg_type == 'MISSION_ITEM_INT' else msg.y
                    if msg.command == mavutil.mavlink.MAV_CMD_NAV_WAYPOINT or msg.command == mavutil.mavlink.MAV_CMD_NAV_SPLINE_WAYPOINT:
                        mission_items.append({"seq": msg.seq, "lat": lat, "lon": lon})
                    else:
                        # Append anyway to keep sequence index correct even if it's a DO_ command
                        mission_items.append({"seq": msg.seq, "lat": lat, "lon": lon})

                    if len(mission_items) < mission_count:
                        master.waypoint_request_send(len(mission_items))
                        last_req_time = time.time()
                    else:
                        mission_state = 'DONE'
                        # Filter out waypoints that have lat/lon = 0 (like DO_ commands)
                        current_telemetry['mission'] = [w for w in mission_items if w["lat"] != 0 and w["lon"] != 0]

            elif msg_type == 'POSITION_TARGET_GLOBAL_INT':
                # 防止讀取到尚未設置的目標 (0)
                if msg.lat_int != 0 and msg.lon_int != 0:
                    current_telemetry['target_lat'] = msg.lat_int / 1e7
                    current_telemetry['target_lon'] = msg.lon_int / 1e7
            elif msg_type == 'MISSION_CURRENT':
                current_telemetry['wp_num'] = msg.seq

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
            data = await websocket.receive_text() # keep-alive
            try:
                cmd = json.loads(data)
                if cmd.get('cmd') == 'refresh_mission':
                    global force_mission_refresh
                    force_mission_refresh = True
            except:
                pass
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