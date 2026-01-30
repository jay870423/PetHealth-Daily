
import React from 'react';
import { TrendStats } from '../types';

const TrendCard: React.FC<{ trend: TrendStats }> = ({ trend }) => {
  const getTrendConfig = (val: number) => {
    if (val > 0) return { icon: '↑', color: 'text-green-500', bg: 'bg-green-50', label: '上升' };
    if (val < 0) return { icon: '↓', color: 'text-red-500', bg: 'bg-red-50', label: '下降' };
    return { icon: '→', color: 'text-gray-400', bg: 'bg-gray-50', label: '持平' };
  };

  const yesterday = getTrendConfig(trend.vsYesterday);
  const avg7d = getTrendConfig(trend.vs7DayAvg);

  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 group">
      <div className="flex justify-between items-start mb-5">
        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em]">趋势洞察</h3>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${
          trend.trendLabel === 'UP' ? 'bg-green-100 text-green-700' : 
          trend.trendLabel === 'DOWN' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {trend.trendLabel === 'UP' ? '活力提升' : trend.trendLabel === 'DOWN' ? '活动偏低' : '状态稳定'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className={`${yesterday.bg} rounded-2xl p-4 transition-colors group-hover:bg-opacity-80`}>
          <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase">较昨日</p>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-black ${yesterday.color}`}>{Math.abs(Math.round(trend.vsYesterday * 100))}%</span>
            <span className={`text-xs font-bold ${yesterday.color}`}>{yesterday.icon}</span>
          </div>
        </div>
        
        <div className={`${avg7d.bg} rounded-2xl p-4 transition-colors group-hover:bg-opacity-80`}>
          <p className="text-[10px] text-gray-400 font-bold mb-1 uppercase">7日均值</p>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-black ${avg7d.color}`}>{Math.abs(Math.round(trend.vs7DayAvg * 100))}%</span>
            <span className={`text-xs font-bold ${avg7d.color}`}>{avg7d.icon}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex items-center gap-2 px-1">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${trend.trendLabel === 'UP' ? 'bg-green-500' : trend.trendLabel === 'DOWN' ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(100, Math.abs(trend.vs7DayAvg * 100) + 50)}%` }}
          ></div>
        </div>
        <span className="text-[9px] text-gray-300 font-bold uppercase">Activity Score</span>
      </div>
    </div>
  );
};

export default TrendCard;
