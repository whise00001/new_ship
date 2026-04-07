import React, { useEffect, useState } from 'react';

export default function DataList() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/logs');
        const data = await res.json();
        setLogs(data);
      } catch (e) {}
    };
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-900 border border-cyan-800 rounded-lg p-5">
      <h2 className="text-sm text-cyan-600 mb-4 border-b border-cyan-900 pb-1">DATABASE LOGS (LAST 10)</h2>
      <div className="overflow-x-auto text-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800">
              <th className="p-2">TIME</th>
              <th className="p-2">LAT / LON</th>
              <th className="p-2">ALT</th>
              <th className="p-2">SPD</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="p-2">{new Date(log.timestamp).toLocaleTimeString()}</td>
                <td className="p-2">{log.lat}, {log.lon}</td>
                <td className="p-2">{log.alt.toFixed(1)}m</td>
                <td className="p-2">{log.ground_speed.toFixed(1)}m/s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
