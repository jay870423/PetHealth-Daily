
import React from 'react';
import { TrendStats } from '../types';

const TrendCard: React.FC<{ trend: TrendStats }> = ({ trend }) => {
  const getTrendIcon = (val: number) => {
    if (val > 0) return '↑';
    if (val < 0) return '↓';
    return '→';
  };

  const getColor = (val: number) => {
    if (val > 0) return 'text-green-500';
    if (val < 0) return 'text-red-500';
    return 'text-gray-400';
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-50 h-full">
      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">趋势对比 (Trend)</h3>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 font-medium">较昨日</span>
          <div className={`flex items-center gap-1 font-bold text-lg ${getColor(trend.vsYesterday)}`}>
            <span>{getTrendIcon(trend.vsYesterday)}</span>
            <span>{Math.abs(Math.round(trend.vsYesterday * 100))}%</span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600 font-medium">较 7 日均值</span>
          <div className={`flex items-center gap-1 font-bold text-lg ${getColor(trend.vs7DayAvg)}`}>
            <span>{getTrendIcon(trend.vs7DayAvg)}</span>
            <span>{Math.abs(Math.round(trend.vs7DayAvg * 100))}%</span>
          </div>
        </div>
        <div className="pt-4 border-t flex items-center justify-between">
          <span className="text-gray-400 text-xs">状态评估</span>
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
            trend.trendLabel === 'UP' ? 'bg-green-100 text-green-700' : 
            trend.trendLabel === 'DOWN' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {trend.trendLabel}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TrendCard;
