import { useState, useEffect } from 'react';
import { Battery, Rss, Gauge, ArrowUpFromLine, Anchor, ShieldAlert, Satellite, MapPin, Route, Clock } from 'lucide-react';

function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371e3; // meters
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dp/2) * Math.sin(dp/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function StatusPanel({ data }) {
  const wpDist = getDistance(data.lat, data.lon, data.target_lat, data.target_lon);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('zh-TW', { hour12: false }));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('zh-TW', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-gray-900 border border-cyan-800 rounded-lg p-5 shadow-[0_0_15px_rgba(8,145,178,0.2)]">
      <h2 className="text-sm text-cyan-600 mb-4 border-b border-cyan-900 pb-1">SYSTEM STATUS</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <Gauge className="text-cyan-400" />
          <div>
            <div className="text-xs text-gray-500">SPEED</div>
            <div className="text-xl font-bold">{data.ground_speed.toFixed(1)} <span className="text-xs">m/s</span></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ArrowUpFromLine className="text-cyan-400" />
          <div>
            <div className="text-xs text-gray-500">ALTITUDE</div>
            <div className="text-xl font-bold">{data.alt.toFixed(1)} <span className="text-xs">m</span></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Battery className={data.battery_voltage < 14 ? "text-red-500" : "text-green-400"} />
          <div>
            <div className="text-xs text-gray-500">BATTERY</div>
            <div className="text-xl font-bold">{data.battery_voltage.toFixed(2)} <span className="text-xs">V</span></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Rss className={data.gps_fix_type >= 3 ? "text-green-400" : "text-yellow-500"} />
          <div>
            <div className="text-xs text-gray-500">GPS FIX</div>
            <div className="text-xl font-bold">{data.gps_fix_type}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Anchor className="text-cyan-400" />
          <div>
            <div className="text-xs text-gray-500">MODE</div>
            <div className="text-xl font-bold">{data.mode || 'MANUAL'}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ShieldAlert className={data.armed ? "text-red-500" : "text-green-400"} />
          <div>
            <div className="text-xs text-gray-500">STATUS</div>
            <div className="text-xl font-bold">{data.armed ? 'ARMED' : 'DISARMED'}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Satellite className="text-cyan-400" />
          <div>
            <div className="text-xs text-gray-500">SATS</div>
            <div className="text-xl font-bold">{data.satellites_visible || 0}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <MapPin className="text-cyan-400" />
          <div>
            <div className="text-xs text-gray-500">HDOP</div>
            <div className="text-xl font-bold">{data.hdop ? data.hdop.toFixed(1) : '0.0'}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Route className={wpDist > 0 ? "text-cyan-400" : "text-gray-600"} />
          <div>
            <div className="text-xs text-gray-500">WP DIST</div>
            <div className="text-xl font-bold">{wpDist > 0 ? (wpDist > 1000 ? (wpDist/1000).toFixed(2) + ' km' : wpDist.toFixed(1) + ' m') : '--'}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Clock className="text-cyan-400" />
          <div>
            <div className="text-xs text-gray-500">LOCAL TIME</div>
            <div className="text-xl font-bold text-cyan-200 mt-0.5 tracking-wider">
              {currentTime}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
