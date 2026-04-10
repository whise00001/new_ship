import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Map } from 'lucide-react';
import { RefreshCw } from 'lucide-react';

// 使用 L.DivIcon 回傳一個帶有旋轉 CSS 的 HTML，以達成動態轉向效果
const getShipIcon = (heading) => new L.DivIcon({
  html: `<div style="transform: rotate(${heading}deg); transition: transform 0.3s ease; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 0 5px #22d3ee);">
           <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#22d3ee" stroke="#083344" stroke-width="1.5">
             <path d="M12 2 L20 20 L12 17 L4 20 Z" />
           </svg>
         </div>`,
  className: '', // 去除預設白底
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// 目標航點的數字圖標 (已縮小)
const getTargetIcon = (num) => new L.DivIcon({
  html: `<div style="background-color: rgba(239,68,68,0.9); border: 2px solid white; border-radius: 50%; color: white; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-family: monospace; font-size: 11px; box-shadow: 0 0 8px rgba(239,68,68,0.8);">${num}</div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const MAP_STYLES = {
  Dark: { name: '深色儀表', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' },
  Street: { name: '標準街景', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' },
  Satellite: { name: '衛星雷達', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' }
};

// 自動對焦邏輯：收到第一筆非零座標時，將地圖中心視角挪過去
function InitialCenter({ lat, lon }) {
  const map = useMap();
  const [hasCentered, setHasCentered] = useState(false);
  useEffect(() => {
    if (lat !== 0 && lon !== 0 && !hasCentered) {
      map.setView([lat, lon], 15);
      setHasCentered(true);
    }
  }, [lat, lon, map, hasCentered]);
  return null;
}

export default function MapModule({ lat, lon, heading, target_lat, target_lon, wp_num, mission = [], onRefreshMission }) {
  const [mapStyle, setMapStyle] = useState('Dark');
  const [mapInstance, setMapInstance] = useState(null);

  const focusShip = () => {
    if (mapInstance && lat !== 0 && lon !== 0) {
      mapInstance.flyTo([lat, lon], 15, { animate: true, duration: 1.5 });
    }
  };

  return (
    <div className="h-[400px] border border-cyan-800 rounded-lg overflow-hidden flex flex-col shadow-[0_0_15px_rgba(8,145,178,0.2)] relative">
      {/* 獨立切換地圖選單 (置於地圖上層) */}
      <div className="absolute top-2 right-2 z-[400] flex gap-2">
        <button
          onClick={onRefreshMission}
          className="px-2 py-1 flex items-center justify-center cursor-pointer text-xs font-bold rounded border backdrop-blur-md transition-all bg-gray-900/60 text-cyan-400 border-cyan-800 hover:bg-cyan-600 hover:text-white"
          title="重新下載航點 (Refresh Mission)"
        >
          <RefreshCw size={16} />
        </button>
        {Object.entries(MAP_STYLES).map(([key, style]) => (
          <button
            key={key}
            onClick={() => setMapStyle(key)}
            className={`px-3 py-1 cursor-pointer text-xs font-bold rounded border backdrop-blur-md transition-colors ${
              mapStyle === key 
                ? 'bg-cyan-600/80 text-white border-cyan-400' 
                : 'bg-gray-900/60 text-cyan-500 border-cyan-800 hover:bg-cyan-900/80'
            }`}
          >
            {style.name}
          </button>
        ))}
      </div>

      {/* 目標對焦按鈕 */}
      <button
        onClick={focusShip}
        className="absolute bottom-4 right-4 z-[400] p-3 rounded-full bg-gray-900/80 border border-cyan-600 text-cyan-400 hover:bg-cyan-600 hover:text-white shadow-[0_0_15px_rgba(34,211,238,0.4)] backdrop-blur-md transition-all cursor-pointer"
        title="尋找船隻"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
        </svg>
      </button>
      
      <MapContainer ref={setMapInstance} center={[25.033, 121.565]} zoom={15} className="h-full w-full bg-gray-900 z-0">
        <InitialCenter lat={lat} lon={lon} />
        <TileLayer
          key={mapStyle} // 確保切換時重新加載圖層
          url={MAP_STYLES[mapStyle].url}
          attribution=""
        />
        <Marker position={[lat || 25.033, lon || 121.565]} icon={getShipIcon(heading)} zIndexOffset={1000} />
        
        {/* 渲染所有任務航點 */}
        {mission && mission.length > 0 && (
          <>
            {mission.map((wp, index) => (
              <Marker 
                key={wp.seq} 
                position={[wp.lat, wp.lon]} 
                icon={getTargetIcon(wp.seq)} 
              />
            ))}
          </>
        )}
      </MapContainer>
    </div>
  );
}
