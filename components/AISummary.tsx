
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
  
  // 核心修复点：使用可选链访问深度嵌套属性
  const steps = report?.activity?.steps ?? 0;
  const temp = report?.vitals?.avgTemp ?? 38.5;
  const petId = report?.petId ?? 'unknown';

  const prevDataRef = useRef<string>('');

  useEffect(() => {
    if (!report?.activity) return; // 如果核心对象不存在，不执行分析

    const currentDataKey = `${petId}-${steps}-${temp}-${provider}`;
    if (prevDataRef.current === currentDataKey) return;
    
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const text = await generatePetSummary(report, provider);
        setSummary(text);
        prevDataRef.current = currentDataKey;
      } catch (e) {
        setSummary("AI 正在伸懒腰，请稍后再试。🐾");
      } finally {
        setLoading(false);
      }
    };
    
    fetchSummary();
  }, [report, provider, steps, temp, petId]);

  return (
    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 relative overflow-hidden group min-h-[160px]">
      <div className="flex items-center gap-4 mb-4 relative z-10">
        <div className="bg-indigo-500 p-2.5 rounded-xl shadow-lg">
          <svg className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="font-bold text-gray-800">AI 深度健康洞察</h3>
      </div>
      
      {loading ? (
        <div className="space-y-2">
          <div className="h-3 bg-gray-100 rounded-full w-full animate-pulse"></div>
          <div className="h-3 bg-gray-100 rounded-full w-2/3 animate-pulse"></div>
        </div>
      ) : (
        <p className="text-gray-600 leading-relaxed text-sm italic">
          "{summary || report.summary}"
        </p>
      )}
    </div>
  );
};

export default AISummary;
