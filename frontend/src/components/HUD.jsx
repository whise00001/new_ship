export default function HUD({ pitch, roll, heading }) {
  return (
    <div className="bg-gray-900 border border-cyan-800 rounded-lg p-5 flex flex-col items-center justify-center relative overflow-hidden h-[250px]">
      <h2 className="absolute top-3 left-3 text-sm text-cyan-600">ATTITUDE HUD</h2>
      
      <div className="absolute top-2 right-2 text-xl font-bold text-cyan-300">
        HDG: {heading.toFixed(0)}°
      </div>

      <div 
        className="w-48 h-48 rounded-full border-2 border-cyan-900 relative flex items-center justify-center transition-transform duration-100"
        style={{ transform: `rotate(${roll}rad)` }}
      >
        <div 
          className="absolute w-full h-[2px] bg-cyan-400 shadow-[0_0_10px_#22d3ee] transition-transform duration-100"
          style={{ transform: `translateY(${pitch * 50}px)` }}
        ></div>
        <div className="w-4 h-4 rounded-full border-2 border-red-500 absolute z-10"></div>
      </div>

      <div className="absolute bottom-2 flex justify-between w-full px-8 text-sm">
        <span>R: {(roll * 57.2958).toFixed(1)}°</span>
        <span>P: {(pitch * 57.2958).toFixed(1)}°</span>
      </div>
    </div>
  );
}
