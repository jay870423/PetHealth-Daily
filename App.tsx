
import React, { useState, useEffect } from 'react';
import StepRing from './components/StepRing';
import ActivityMap from './components/ActivityMap';
import AISummary from './components/AISummary';
import TrendCard from './components/TrendCard';
import DeviceCard from './components/DeviceCard';
import DataImportModal from './components/DataImportModal';
import { DailyReport, Pet } from './types';

const PETS: Pet[] = [
  { id: "221", name: "豆腐", breed: "萨摩耶", avatar: "https://picsum.photos/seed/tofu/100/100" },
  { id: "105", name: "糯米", breed: "边境羊犬", avatar: "https://picsum.photos/seed/nuomi/100/100" },
  { id: "302", name: "可乐", breed: "英短蓝猫", avatar: "https://picsum.photos/seed/cola/100/100" },
];

const App: React.FC = () => {
  const [selectedPetId, setSelectedPetId] = useState<string>(PETS[0].id);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<'connected' | 'demo'>('demo');
  const [isPetMenuOpen, setIsPetMenuOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const selectedPet = PETS.find(p => p.id === selectedPetId) || PETS[0];

  const fetchReport = async (petId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/telemetry?petId=${petId}&_t=${Date.now()}`);
      
      // 处理非 200 响应
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      // 如果后端返回错误标志或空标志，降级到 Mock
      if (data.error || data._empty) {
        setDbStatus('demo');
        const { generateDailyReport } = await import('./services/mockData');
        setReport(generateDailyReport(petId));
      } else {
        setReport(data);
        setDbStatus('connected');
      }
    } catch (err) {
      console.warn("API Fetch Failed, Falling back to Mock data:", err);
      setDbStatus('demo');
      const { generateDailyReport } = await import('./services/mockData');
      setReport(generateDailyReport(petId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(selectedPetId);
    // 每 60 秒自动刷新一次数据
    const timer = setInterval(() => fetchReport(selectedPetId), 60000);
    return () => clearInterval(timer);
  }, [selectedPetId]);

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-12">
      {/* Top Header */}
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

            {isPetMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsPetMenuOpen(false)}></div>
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-3xl shadow-2xl border border-gray-100 py-2 z-20 overflow-hidden">
                  {PETS.map(pet => (
                    <button
                      key={pet.id}
                      onClick={() => { setSelectedPetId(pet.id); setIsPetMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${selectedPetId === pet.id ? 'bg-indigo-50/50' : ''}`}
                    >
                      <img src={pet.avatar} className="w-8 h-8 rounded-full" alt={pet.name} />
                      <div className="text-left">
                        <p className="text-sm font-bold text-gray-800">{pet.name}</p>
                        <p className="text-[10px] text-gray-400">{pet.breed}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            导入
          </button>
        </div>
      </div>

      <div className={`max-w-6xl mx-auto px-4 md:px-8 space-y-6 transition-all duration-300 ${loading ? 'opacity-60' : 'opacity-100'}`}>
        {report ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Activity Section */}
              <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-10 hover:shadow-md transition-shadow">
                <StepRing steps={report.activity?.steps || 0} goal={10000} />
                <div className="flex-1 w-full space-y-4">
                  <div className="flex justify-between items-end">
                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">活跃度指标</span>
                    <span className="text-[10px] text-gray-300 font-mono">上次更新: {new Date(report.device?.lastSeen || Date.now()).toLocaleTimeString()}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-[1.5rem] p-5">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">目标进度</p>
                      <p className="text-3xl font-black text-gray-800 tracking-tight">
                        {((report.activity?.completionRate || 0) * 100).toFixed(0)}<span className="text-lg ml-0.5">%</span>
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-[1.5rem] p-5">
                      <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">运动等级</p>
                      <p className={`text-xl font-black ${
                        report.activity?.activeLevel === 'HIGH' ? 'text-orange-500' : 'text-indigo-600'
                      }`}>
                        {report.activity?.activeLevel || 'NORMAL'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <AISummary report={report} />

              {/* Map Section */}
              <div className="bg-white rounded-[2.5rem] h-[450px] shadow-sm border border-gray-100 overflow-hidden relative group">
                <ActivityMap coordinates={report.coordinates || []} />
                <div className="absolute top-4 right-4 z-10">
                  <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-100 text-[10px] font-bold text-indigo-600 shadow-sm">
                    轨迹基于今日 GPS 数据点位
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Vitals Sidebar */}
              <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6">核心体征 (Vitals)</h3>
                <div className="space-y-6">
                  <div className={`p-6 rounded-[2rem] flex justify-between items-center transition-colors ${
                    report.vitals?.status === 'WARNING' ? 'bg-red-50' : 'bg-indigo-50/50'
                  }`}>
                    <div>
                      <p className={`text-[10px] font-bold uppercase mb-1 ${
                        report.vitals?.status === 'WARNING' ? 'text-red-400' : 'text-indigo-400'
                      }`}>平均体温</p>
                      <p className={`text-4xl font-black ${
                        report.vitals?.status === 'WARNING' ? 'text-red-900' : 'text-indigo-900'
                      }`}>{report.vitals?.avgTemp || '--'}°C</p>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      report.vitals?.status === 'WARNING' ? 'bg-red-200 text-red-600' : 'bg-white text-indigo-500 shadow-sm'
                    }`}>
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                      <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">环境压力</p>
                      <p className="font-black text-gray-700">{report.vitals?.avgPressure || '--'} <span className="text-[9px] font-normal text-gray-400">hPa</span></p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                      <p className="text-[9px] text-gray-400 font-bold uppercase mb-1">状态评分</p>
                      <p className="font-black text-green-600">{report.vitals?.status === 'NORMAL' ? '优秀' : '待观察'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <TrendCard trend={report.trend} />
              <DeviceCard device={report.device} />

              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-white/20 p-1.5 rounded-lg">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">专家建议</span>
                </div>
                <p className="text-sm font-medium leading-relaxed opacity-90 italic">
                  "{report.advice?.[0] || '继续保持规律的户外活动，健康生活每一天！'}"
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-96 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      <DataImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImport={(data) => setReport(prev => prev ? ({...prev, ...data}) : prev as any)} 
      />
    </div>
  );
};

export default App;
