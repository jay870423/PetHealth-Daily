
import React from 'react';
import { DeviceStats } from '../types';

const DeviceCard: React.FC<{ device: DeviceStats }> = ({ device }) => {
  // 电量百分比计算 (假设 3.3V-4.2V)
  const batteryPct = Math.min(Math.max(Math.round(((device.battery - 3.3) / 0.9) * 100), 0), 100);
  
  const getSignalLevel = (rsrp: number) => {
    if (rsrp > -80) return 4;
    if (rsrp > -95) return 3;
    if (rsrp > -110) return 2;
    return 1;
  };

  const signalLevel = getSignalLevel(device.rsrp);

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">硬件状态</h3>
        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
          <div className={`w-1.5 h-1.5 rounded-full ${device.dataStatus === 'NORMAL' ? 'bg-green-500 animate-pulse' : 'bg-orange-500'}`}></div>
          <span className="text-[10px] font-bold text-gray-600 uppercase">{device.dataStatus}</span>
        </div>
      </div>

      <div className="space-y-5">
        {/* Battery Bar */}
        <div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase">设备电量</span>
            <span className="text-sm font-black text-gray-800">{batteryPct}% <span className="text-[10px] text-gray-400 font-normal">{device.battery}V</span></span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${batteryPct < 20 ? 'bg-red-500' : batteryPct < 50 ? 'bg-orange-400' : 'bg-green-500'}`}
              style={{ width: `${batteryPct}%` }}
            ></div>
          </div>
        </div>

        {/* Signal & Last Seen Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-2xl p-3">
            <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">信号强度</p>
            <div className="flex items-end gap-1 h-4">
              {[1, 2, 3, 4].map(level => (
                <div 
                  key={level}
                  className={`flex-1 rounded-sm transition-colors ${level <= signalLevel ? 'bg-blue-500' : 'bg-gray-200'}`}
                  style={{ height: `${level * 25}%` }}
                ></div>
              ))}
              <span className="text-[10px] font-black text-blue-600 ml-1">{device.rsrp}</span>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-2xl p-3 flex flex-col justify-center">
            <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">最近上报</p>
            <p className="text-[11px] font-black text-gray-700 truncate">
              {new Date(device.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceCard;
