import time
import math
from pymavlink import mavutil

# 建立 UDP 連線，並發送至 14551 埠
master = mavutil.mavlink_connection('udpout:127.0.0.1:14551')

lat = 25.0330 * 1e7
lon = 121.5654 * 1e7
alt = 100 * 1000  # mm
heading = 0
groundspeed = 15.5

print("開始發送模擬 MAVLink 資料...")
t = 0
while True:
    t += 0.1

    # 發送 HEARTBEAT (模擬已解鎖 ARMED 與 AUTO 模式)
    master.mav.heartbeat_send(
        mavutil.mavlink.MAV_TYPE_SURFACE_BOAT,
        mavutil.mavlink.MAV_AUTOPILOT_ARDUPILOTMEGA,
        mavutil.mavlink.MAV_MODE_FLAG_SAFETY_ARMED | mavutil.mavlink.MAV_MODE_FLAG_CUSTOM_MODE_ENABLED,
        15, # 15 是 Rover/Boat 的 AUTO MODE
        mavutil.mavlink.MAV_STATE_ACTIVE
    )

    # 模擬座標微幅移動
    lat += 120 * math.cos(t)
    lon += 120 * math.sin(t)
    
    # 模擬姿態改變
    pitch = 0.5 * math.sin(t * 1.5)
    roll = 0.3 * math.cos(t * 1.5)
    heading = (heading + 2) % 360
    
    # 發送 GLOBAL_POSITION_INT
    master.mav.global_position_int_send(
        int(time.time()),
        int(lat), int(lon), int(alt), int(alt),
        0, 0, 0, int(heading * 100)
    )
    # 發送 VFR_HUD
    master.mav.vfr_hud_send(
        15.5, groundspeed, heading, 50, alt / 1000.0, 0
    )
    # 發送 ATTITUDE
    master.mav.attitude_send(
        int(time.time()),
        roll, pitch, heading * (math.pi/180),
        0, 0, 0
    )
    # 發送 SYS_STATUS (電池等狀態)
    master.mav.sys_status_send(
        0, 0, 0,
        500, 14500 if t % 10 < 5 else 13800, -1, 50, 0, 0, 0, 0, 0, 0, 0
    )
    # 發送 GPS_RAW_INT
    master.mav.gps_raw_int_send(
        int(time.time()),
        3, int(lat), int(lon), int(alt), 150, 150, 0, 0, 12
    )
    
    # 模擬「下一個航點」
    target_lat = lat + 20000 * math.cos(t * 0.1)
    target_lon = lon + 20000 * math.sin(t * 0.1)
    master.mav.position_target_global_int_send(
        int(time.time()), 0, 0,
        mavutil.mavlink.MAV_FRAME_GLOBAL_INT,
        0, # ignored mask
        int(target_lat), int(target_lon), int(alt), 
        0, 0, 0, 0, 0, 0, 0, 0
    )
    # 模擬當前航點編號
    master.mav.mission_current_send(1)
    
    # 處理任務請求
    req = master.recv_match(blocking=False)
    if req:
        if req.get_type() == 'MISSION_REQUEST_LIST':
            master.mav.mission_count_send(
                master.target_system, master.target_component, 3, mavutil.mavlink.MAV_MISSION_TYPE_MISSION
            )
        elif req.get_type() in ['MISSION_REQUEST', 'MISSION_REQUEST_INT']:
            master.mav.mission_item_int_send(
                master.target_system, master.target_component, req.seq,
                mavutil.mavlink.MAV_FRAME_GLOBAL_INT,
                mavutil.mavlink.MAV_CMD_NAV_WAYPOINT,
                0, 1, 0, 0, 0, 0,
                int(lat + (req.seq + 1)*10000), int(lon + (req.seq + 1)*10000), int(alt),
                mavutil.mavlink.MAV_MISSION_TYPE_MISSION
            )
    
    time.sleep(0.1) # 10Hz 發送頻率
