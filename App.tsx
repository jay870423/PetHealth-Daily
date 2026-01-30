
import React, { useState, useEffect } from 'react';
import StepRing from './components/StepRing';
import ActivityMap from './components/ActivityMap';
import AISummary from './components/AISummary';
import TrendCard from './components/TrendCard';
import DeviceCard from './components/DeviceCard';
import DataImportModal from './components/DataImportModal';
import { generatePetSummary } from './services/aiService';
import { DailyReport, Pet, AiProvider } from './types';

const PETS: Pet[] = [
  { id: "221", name: "豆腐", breed: "萨摩耶", avatar: "https://picsum.photos/seed/tofu/100/100" },
  { id: "105", name: "糯米", breed: "边境羊犬", avatar: "https://picsum.photos/seed/nuomi/100/100" },
  { id: "302", name: "可乐", breed: "英短蓝猫", avatar: "https://picsum.photos/seed/cola/100/100" },
];

const App: React.FC = () => {
  const [selectedPetId, setSelectedPetId] = useState<string>(PETS[0].id);
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>('gemini');
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'demo'>('demo');
  const [isPetMenuOpen, setIsPetMenuOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const selectedPet = PETS.find(p => p.id === selectedPetId) || PETS[0];

  const fetchReport = async (petId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/telemetry?petId=${petId}&_t=${Date.now()}`);
      let baseReport: DailyReport;

      if (!response.ok) throw new Error('API Unavailable');
      const data = await response.json();
      
      if (data.error || data._empty) {
        setDbStatus('demo');
        const { generateDailyReport } = await import('./services/mockData');
        baseReport = generateDailyReport(petId);
      } else {
        baseReport = data;
        setDbStatus('connected');
      }

      setReport(baseReport);
      setLoading(false);
      triggerAIAnalysis(baseReport, selectedProvider);

    } catch (err) {
      setDbStatus('demo');
      const { generateDailyReport } = await import('./services/mockData');
      const mockReport = generateDailyReport(petId);
      setReport(mockReport);
      setLoading(false);
      triggerAIAnalysis(mockReport, selectedProvider);
    }
  };

  const triggerAIAnalysis = async (currentReport: DailyReport, provider: AiProvider) => {
    setAiLoading(true);
    try {
      const aiResult = await generatePetSummary(currentReport, provider);
      setReport(prev => prev ? ({
        ...prev,
        summary: aiResult.summary,
        advice: aiResult.advice
      }) : null);
    } catch (e) {
      console.warn("AI Analysis Failed");
    } finally {
      setAiLoading(false);
    }
  };

  // 当 Provider 改变时自动重新分析
  useEffect(() => {
    if (report) {
      triggerAIAnalysis(report, selectedProvider);
    }
  }, [selectedProvider]);

  useEffect(() => {
    fetchReport(selectedPetId);
  }, [selectedPetId]);

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-12">
      {/* Header */}
      <div className="sticky top-0 z-[1001] bg-white/80 backdrop-blur-xl border-b border-gray-100 mb-8 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="relative">
            <button 
              onClick={() => setIsPetMenuOpen(!isPetMenuOpen)}
              className="flex items-center gap-3 hover:bg-gray-100 p-2 rounded-2xl transition-all active:scale-95"
            >
              <img src={selectedPet.avatar} alt={selectedPet.name} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
              <div className="text-left">
                <h1 className="text-lg font-bold text-gray-900 leading-tight">{selectedPet.name}的日报</h1>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-green-500' : 'bg-orange-400 animate-pulse'}`}></span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">
                    {dbStatus === 'connected' ? 'REAL-TIME' : 'DEMO MODE'}
                  </span>
                </div>
              </div>
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            {/* AI Provider Switcher */}
            <div className="hidden md:flex bg-gray-100 p-1 rounded-xl">
              {(['gemini', 'deepseek', 'qwen'] as AiProvider[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedProvider(p)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                    selectedProvider === p ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button onClick={() => setIsImportModalOpen(true)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-lg hover:bg-indigo-700 active:scale-95">导入</button>
          </div>
        </div>
      </div>

      <div className={`max-w-6xl mx-auto px-4 md:px-8 space-y-6 transition-all duration-300 ${loading ? 'opacity-60' : 'opacity-100'}`}>
        {report ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-10">
                <StepRing steps={report.activity?.steps || 0} goal={10000} />
                <div className="flex-1 w-full space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">活跃度指标</span>
                    <span className="text-[10px] text-gray-300 font-mono">更新: {new Date(report.device?.lastSeen || Date.now()).toLocaleTimeString()}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-[1.5rem] p-5">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">目标进度</p>
                      <p className="text-3xl font-black text-gray-800 tracking-tight">{((report.activity?.completionRate || 0) * 100).toFixed(0)}%</p>
                    </div>
                    <div className="bg-gray-50 rounded-[1.5rem] p-5">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">运动等级</p>
                      <p className="text-xl font-black text-indigo-600">{report.activity?.activeLevel || 'NORMAL'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <AISummary summary={report.summary} isLoading={aiLoading} provider={selectedProvider} />

              <div className="bg-white rounded-[2.5rem] h-[450px] shadow-sm border border-gray-100 overflow-hidden relative group">
                <ActivityMap coordinates={report.coordinates || []} />
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6">核心体征</h3>
                <div className={`p-6 rounded-[2rem] flex justify-between items-center ${report.vitals?.status === 'WARNING' ? 'bg-red-50' : 'bg-indigo-50/50'}`}>
                  <div>
                    <p className="text-[10px] text-indigo-400 font-bold uppercase mb-1">平均体温</p>
                    <p className="text-4xl font-black text-indigo-900">{report.vitals?.avgTemp || '--'}°C</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                    <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                </div>
              </div>

              <TrendCard trend={report.trend} />
              <DeviceCard device={report.device} />

              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
                {aiLoading && (
                  <div className="absolute inset-0 bg-indigo-600/30 backdrop-blur-[1px] flex items-center justify-center">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-white/20 p-1.5 rounded-lg">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">专家建议 ({selectedProvider.toUpperCase()})</span>
                </div>
                <div className="space-y-3">
                  {report.advice && report.advice.length > 0 ? (
                    report.advice.map((item, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="opacity-60 text-sm">{idx + 1}.</span>
                        <p className="text-sm font-medium leading-relaxed opacity-95">{item}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm opacity-60">正在基于体征数据制定方案...</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-96 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      <DataImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={(data) => setReport(prev => prev ? ({...prev, ...data}) : prev as any)} />
    </div>
  );
};

export default App;
