import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Map } from 'lucide-react';

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

const MAP_STYLES = {
  Dark: { name: '深色儀表', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' },
  Street: { name: '標準街景', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' },
  Satellite: { name: '衛星雷達', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' }
};

export default function MapModule({ lat, lon, heading }) {
  const [path, setPath] = useState([]);
  const [mapStyle, setMapStyle] = useState('Dark');

  useEffect(() => {
    if (lat !== 0 && lon !== 0) {
      setPath(prev => [...prev, [lat, lon]]);
    }
  }, [lat, lon]);

  return (
    <div className="h-[400px] border border-cyan-800 rounded-lg overflow-hidden flex flex-col shadow-[0_0_15px_rgba(8,145,178,0.2)] relative">
      {/* 獨立切換地圖選單 (置於地圖上層) */}
      <div className="absolute top-2 right-2 z-[400] flex gap-2">
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
      
      <MapContainer center={[lat || 25.033, lon || 121.565]} zoom={15} className="h-full w-full bg-gray-900 z-0">
        <TileLayer
          key={mapStyle} // 確保切換時重新加載圖層
          url={MAP_STYLES[mapStyle].url}
          attribution=""
        />
        <Marker position={[lat || 25.033, lon || 121.565]} icon={getShipIcon(heading)} />
        {/* 在衛星地圖下改用黃色軌跡避免被深色海水吃掉顏色 */}
        <Polyline positions={path} color={mapStyle === 'Satellite' ? '#ffeb3b' : '#22d3ee'} weight={3} opacity={0.8} />
      </MapContainer>
    </div>
  );
}
