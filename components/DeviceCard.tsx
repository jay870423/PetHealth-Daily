
import React from 'react';
import { DeviceStats } from '../types';

const DeviceCard: React.FC<{ device: DeviceStats }> = ({ device }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NORMAL': return 'bg-green-500';
      case 'DEGRADED': return 'bg-orange-500';
      case 'OFFLINE': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">设备状态 (Device)</h3>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${getStatusColor(device.dataStatus)}`}></span>
          <span className="text-xs font-bold text-gray-700">{device.dataStatus}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-[10px] text-gray-400 uppercase mb-1">电量 (V)</p>
          <p className="text-xl font-bold text-gray-800">{device.battery}<span className="text-xs ml-0.5">V</span></p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-[10px] text-gray-400 uppercase mb-1">信号 (RSRP)</p>
          <p className="text-xl font-bold text-gray-800">{device.rsrp}<span className="text-xs ml-0.5">dBm</span></p>
        </div>
      </div>
      <div className="mt-4 text-[10px] text-gray-400 text-right italic">
        最后同步: {new Date(device.lastSeen).toLocaleTimeString()}
      </div>
    </div>
  );
};

export default DeviceCard;
