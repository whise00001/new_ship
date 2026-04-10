import React, { useEffect, useState, useRef } from 'react';
import HUD from './components/HUD';
import MapModule from './components/MapModule';
import StatusPanel from './components/StatusPanel';
import DataList from './components/DataList';

export default function App() {
  const [telemetry, setTelemetry] = useState({
    lat: 25.0330, lon: 121.5654, alt: 0, ground_speed: 0, 
    heading: 0, pitch: 0, roll: 0, battery_voltage: 0, gps_fix_type: 0,
    armed: false, mode: 'UNKNOWN', satellites_visible: 0, hdop: 0.0,
    target_lat: 0, target_lon: 0, wp_num: 0, mission: []
  });

  const [isConnected, setIsConnected] = useState(false);
  const timeoutRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/telemetry');
    wsRef.current = ws;
    ws.onmessage = (event) => {
      setTelemetry(JSON.parse(event.data));
      setIsConnected(true);
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setIsConnected(false);
      }, 2000);
    };
    return () => {
      ws.close();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-cyan-400 p-4 font-mono">
      <header className="mb-6 border-b border-cyan-800 pb-2 flex justify-between items-end">
        <h1 className="text-2xl font-bold tracking-widest text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
          USV COMMAND CENTER_
        </h1>
        <div className="flex items-center gap-2 pb-1">
          <div className={`w-3 h-3 rounded-full shadow-[0_0_8px_currentColor] ${isConnected ? 'bg-green-500 text-green-500' : 'bg-red-500 text-red-500'}`}></div>
          <span className={`text-sm font-bold ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
            {isConnected ? 'LINK ACTIVE' : 'NO SIGNAL'}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <StatusPanel data={telemetry} />
          <HUD pitch={telemetry.pitch} roll={telemetry.roll} heading={telemetry.heading} />
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          <MapModule 
            lat={telemetry.lat} 
            lon={telemetry.lon} 
            heading={telemetry.heading} 
            target_lat={telemetry.target_lat} 
            target_lon={telemetry.target_lon} 
            wp_num={telemetry.wp_num} 
            mission={telemetry.mission}
            onRefreshMission={() => {
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ cmd: 'refresh_mission' }));
              }
            }}
          />
          <DataList />
        </div>
      </div>
    </div>
  );
}
