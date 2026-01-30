
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPetMenuOpen, setIsPetMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'error' | 'demo'>('demo');
  const [lastError, setLastError] = useState<string | null>(null);

  const selectedPet = PETS.find(p => p.id === selectedPetId) || PETS[0];

  const fetchReport = async (petId: string) => {
    setLoading(true);
    setLastError(null);
    
    try {
      const url = `/api/telemetry?petId=${petId}&_t=${Date.now()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      if (response.status === 404) {
        setDbStatus('demo');
        const { generateDailyReport } = await import('./services/mockData');
        setReport(generateDailyReport(petId));
        return;
      }

      const data = await response.json();

      if (data._empty) {
        setDbStatus('connected');
        setLastError(data.message);
        const { generateDailyReport } = await import('./services/mockData');
        setReport(generateDailyReport(petId));
        return;
      }

      setReport(data);
      setDbStatus('connected');
    } catch (err: any) {
      setDbStatus('demo');
      const { generateDailyReport } = await import('./services/mockData');
      setReport(generateDailyReport(petId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(selectedPetId);
    const interval = setInterval(() => fetchReport(selectedPetId), 30000);
    return () => clearInterval(interval);
  }, [selectedPetId]);

  const handleImportData = (updatedFields: Partial<DailyReport>) => {
    if (!report) return;
    setReport(prev => prev ? ({ ...prev, ...updatedFields }) : prev);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-12 selection:bg-indigo-100">
      {/* Top Navigation */}
      <div className="sticky top-0 z-[1001] bg-white/80 backdrop-blur-xl border-b border-gray-100 mb-8">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="relative">
            <button 
              onClick={() => setIsPetMenuOpen(!isPetMenuOpen)}
              className="flex items-center gap-3 hover:bg-gray-50 p-1 rounded-2xl transition-all active:scale-95"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-500 overflow-hidden border-2 border-white shadow-sm ring-2 ring-indigo-100">
                 <img src={selectedPet.avatar} alt={selectedPet.name} className="w-full h-full object-cover" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1">
                  <h1 className="text-lg font-bold text-gray-900 leading-tight">{selectedPet.name}的日报</h1>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${isPetMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-gray-400 font-mono uppercase tracking-tighter">{selectedPet.breed} · ID:{selectedPet.id}</p>
                  <div className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      dbStatus === 'connected' ? 'bg-green-500' : 'bg-orange-400 animate-pulse'
                    }`}></div>
                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                      {dbStatus === 'connected' ? 'LIVE SYNC' : 'DEMO MODE'}
                    </span>
                  </div>
                </div>
              </div>
            </button>

            {isPetMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsPetMenuOpen(false)}></div>
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-3xl shadow-2xl border border-gray-100 py-2 z-20 animate-in fade-in slide-in-from-top-2">
                  <p className="px-5 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">切换监测对象</p>
                  {PETS.map(pet => (
                    <button
                      key={pet.id}
                      onClick={() => { setSelectedPetId(pet.id); setIsPetMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${selectedPetId === pet.id ? 'bg-indigo-50/50' : ''}`}
                    >
                      <img src={pet.avatar} className="w-8 h-8 rounded-full border border-gray-100 object-cover" alt={pet.name} />
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
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              离线补录
            </button>
          </div>
        </div>
      </div>

      <div className={`max-w-6xl mx-auto px-4 md:px-8 space-y-6 transition-all duration-500 ${loading ? 'opacity-50' : 'opacity-100'}`}>
        {report && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
            <div className="lg:col-span-2 space-y-6">
              {/* Activity Ring Section */}
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-8 hover:shadow-md transition-shadow">
                <StepRing steps={report.activity.steps} goal={10000} />
                <div className="flex-1 space-y-4 w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">活跃等级</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        report.activity.activeLevel === 'HIGH' ? 'bg-orange-100 text-orange-600' : 
                        report.activity.activeLevel === 'NORMAL' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                      }`}>{report.activity.activeLevel}</span>
                    </div>
                    <span className="text-[10px] text-gray-300 font-mono">Synced: {new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <p className="text-[10px] text-gray-400 uppercase font-bold">目标达成</p>
                      <p className="text-xl font-bold text-gray-800">{(report.activity.completionRate * 100).toFixed(0)}%</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <p className="text-[10px] text-gray-400 uppercase font-bold">平均步幅</p>
                      <p className="text-xl font-bold text-gray-800">{report.activity.stride}m</p>
                    </div>
                  </div>
                </div>
              </div>

              <AISummary report={report} />

              {/* Enhanced Footprint Map */}
              <div className="bg-white rounded-[2rem] h-[450px] shadow-sm border border-gray-100 overflow-hidden relative group">
                <ActivityMap coordinates={report.coordinates} />
                <div className="absolute bottom-4 left-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl border border-gray-200 text-[10px] font-bold text-gray-500 shadow-sm">
                    轨迹基于地理栅栏点位实时绘制
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar with optimized layout */}
            <div className="space-y-6">
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] mb-6">核心体征 (Vitals)</h3>
                <div className="space-y-6">
                  <div className="flex justify-between items-center p-5 bg-indigo-50/50 rounded-3xl">
                    <div>
                      <p className="text-[10px] text-indigo-400 font-bold uppercase mb-1">平均体温</p>
                      <p className="text-3xl font-black text-indigo-900">{report.vitals.avgTemp}°C</p>
                    </div>
                    <div className={`p-3 rounded-2xl ${report.vitals.status === 'WARNING' ? 'bg-red-100 text-red-600' : 'bg-white text-indigo-600 shadow-sm'}`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-50 bg-gray-50/30 rounded-2xl">
                      <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">环境气压</p>
                      <p className="font-black text-gray-800">{report.vitals.avgPressure} <span className="text-[9px] text-gray-400 font-normal">hPa</span></p>
                    </div>
                    <div className="p-4 border border-gray-50 bg-gray-50/30 rounded-2xl">
                      <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">活跃海拔</p>
                      <p className="font-black text-gray-800">{report.vitals.avgHeight} <span className="text-[9px] text-gray-400 font-normal">m</span></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Re-adjusted Twin Cards for better vertical balance */}
              <TrendCard trend={report.trend} />
              <DeviceCard device={report.device} />
              
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] p-6 text-white shadow-lg shadow-indigo-100 active:scale-[0.98] transition-transform cursor-default">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-bold uppercase tracking-wider">专家建议</span>
                </div>
                <p className="text-sm font-medium leading-relaxed opacity-90 italic">
                  "{report.advice[0] || '保持充足的水分，享受健康的一天！'}"
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <DataImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImport={handleImportData} 
      />
    </div>
  );
};

export default App;
