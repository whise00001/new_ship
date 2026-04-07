import { Battery, Rss, Gauge, ArrowUpFromLine, Anchor, ShieldAlert } from 'lucide-react';

export default function StatusPanel({ data }) {
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
      </div>
    </div>
  );
}
