
import React, { useState, useEffect, useRef } from 'react';
import { generatePetSummary } from '../services/aiService';
import { DailyReport, AiProvider } from '../types';

interface AISummaryProps {
  report: DailyReport;
}

const AISummary: React.FC<AISummaryProps> = ({ report }) => {
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<AiProvider>('gemini');
  const prevDataRef = useRef<string>('');

  const providers: { id: AiProvider; label: string; color: string }[] = [
    { id: 'gemini', label: 'Gemini', color: 'bg-indigo-500' },
    { id: 'deepseek', label: 'DeepSeek', color: 'bg-blue-600' },
    { id: 'qwen', label: '通义千问', color: 'bg-purple-600' },
  ];

  useEffect(() => {
    const currentDataKey = `${report.petId}-${report.activity.steps}-${report.vitals.avgTemp}-${provider}`;
    if (prevDataRef.current === currentDataKey) return;
    
    const fetchSummary = async () => {
      setLoading(true);
      const text = await generatePetSummary(report, provider);
      setSummary(text);
      setLoading(false);
      prevDataRef.current = currentDataKey;
    };
    
    fetchSummary();
  }, [report, provider]);

  const activeProvider = providers.find(p => p.id === provider);

  return (
    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 relative overflow-hidden group">
      {/* Background Accent */}
      <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full -mr-16 -mt-16 transition-all duration-700 ${activeProvider?.color}`}></div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className={`${activeProvider?.color} p-3 rounded-2xl shadow-lg transition-colors duration-500`}>
            <svg className={`w-6 h-6 text-white ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">AI 深度健康洞察</h3>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-2 w-2 rounded-full opacity-75 ${loading ? 'bg-gray-400' : 'bg-green-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${loading ? 'bg-gray-500' : 'bg-green-500'}`}></span>
              </span>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                {loading ? '正在分析...' : '报告已生成'}
              </p>
            </div>
          </div>
        </div>

        {/* Model Switcher */}
        <div className="flex bg-gray-50 p-1 rounded-xl self-start md:self-center border border-gray-100">
          {providers.map(p => (
            <button
              key={p.id}
              onClick={() => setProvider(p.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                provider === p.id 
                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200' 
                : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="min-h-[100px] relative z-10">
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 bg-gray-100 rounded-full w-full animate-pulse"></div>
            <div className="h-4 bg-gray-100 rounded-full w-11/12 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="h-4 bg-gray-100 rounded-full w-4/5 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute -left-2 top-0 text-5xl text-gray-100 font-serif opacity-30 select-none">“</div>
            <p className="text-gray-700 leading-[1.8] font-medium pl-6 pr-2 text-[15px]">
              {summary}
            </p>
            <div className="flex justify-end mt-4">
              <span className={`text-[10px] text-white px-3 py-1 rounded-full font-bold uppercase tracking-tighter shadow-sm ${activeProvider?.color}`}>
                Engine: {activeProvider?.label}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AISummary;
