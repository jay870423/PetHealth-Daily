
import React from 'react';
import { AiProvider } from '../types';

interface AISummaryProps {
  summary: string;
  isLoading: boolean;
  provider: AiProvider;
}

const AISummary: React.FC<AISummaryProps> = ({ summary, isLoading, provider }) => {
  const getProviderConfig = () => {
    switch (provider) {
      case 'deepseek':
        return { color: 'bg-blue-600', text: 'text-blue-600', label: 'DEEPSEEK V3', border: 'border-blue-100' };
      case 'qwen':
        return { color: 'bg-emerald-500', text: 'text-emerald-500', label: 'QWEN PLUS', border: 'border-emerald-100' };
      default:
        return { color: 'bg-indigo-500', text: 'text-indigo-500', label: 'GEMINI 3 FLASH', border: 'border-indigo-100' };
    }
  };

  const config = getProviderConfig();

  return (
    <div className={`bg-white rounded-[2rem] p-8 shadow-sm border ${isLoading ? config.border : 'border-gray-100'} transition-all duration-500 relative overflow-hidden group min-h-[160px]`}>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className={`${config.color} p-2.5 rounded-xl shadow-lg transition-colors duration-500`}>
            <svg className={`w-5 h-5 text-white ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-gray-800">AI 深度健康洞察</h3>
            <span className={`text-[9px] font-black tracking-widest uppercase ${config.text} transition-colors`}>{config.label}</span>
          </div>
        </div>
        
        {isLoading && (
          <div className="flex gap-1 items-center mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">分析中</span>
          </div>
        )}
      </div>
      
      {isLoading && !summary ? (
        <div className="space-y-3">
          <div className="h-4 bg-gray-100 rounded-full w-full animate-pulse"></div>
          <div className="h-4 bg-gray-100 rounded-full w-4/5 animate-pulse"></div>
          <div className="h-4 bg-gray-100 rounded-full w-2/3 animate-pulse"></div>
        </div>
      ) : (
        <p className={`text-gray-600 leading-relaxed text-sm italic transition-all duration-500 ${isLoading ? 'opacity-30 translate-x-1' : 'opacity-100 translate-x-0'}`}>
          "{summary || "正在读取您的宠物体征，准备进行跨模型分析..."}"
        </p>
      )}

      {/* Decorative model-specific background */}
      <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-10 transition-colors duration-500 ${config.color}`}></div>
    </div>
  );
};

export default AISummary;
