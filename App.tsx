
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
  { id: "105", name: "糯米", breed: "边境牧羊犬", avatar: "https://picsum.photos/seed/nuomi/100/100" },
  { id: "302", name: "可乐", breed: "英短蓝猫", avatar: "https://picsum.photos/seed/cola/100/100" },
];

const App: React.FC = () => {
  const [selectedPetId, setSelectedPetId] = useState<string>(PETS[0].id);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPetMenuOpen, setIsPetMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'error' | 'syncing'>('syncing');
  const [lastError, setLastError] = useState<string | null>(null);

  const selectedPet = PETS.find(p => p.id === selectedPetId) || PETS[0];

  const fetchReport = async (petId: string) => {
    setLoading(true);
    setDbStatus('syncing');
    setLastError(null);
    try {
      const response = await fetch(`/api/telemetry?petId=${petId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "数据获取失败");
      }
      const data = await response.json();
      setReport(data);
      setDbStatus('connected');
    } catch (err: any) {
      console.error("InfluxDB Fetch Error:", err);
      setDbStatus('error');
      setLastError(err.message);
      // 降级使用 Mock 数据以保证 UI 展示
      const { generateDailyReport } = await import('./services/mockData');
      setReport(generateDailyReport(petId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(selectedPetId);
    const interval = setInterval(() => fetchReport(selectedPetId), 300000);
    return () => clearInterval(interval);
  }, [selectedPetId]);

  const handleImportData = (updatedFields: Partial<DailyReport>) => {
    if (!report) return;
    setReport(prev => prev ? ({ ...prev, ...updatedFields }) : prev);
  };

  const getSpeciesLabel = (sid: number) => {
    if (sid === 1) return "小狗模式";
    if (sid === 2) return "小猫模式";
    return "智能模式";
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-12">
      {/* Top Navigation */}
      <div className="sticky top-0 z-[1001] bg-white/80 backdrop-blur-xl border-b border-gray-100 mb-8">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="relative">
            <button 
              onClick={() => setIsPetMenuOpen(!isPetMenuOpen)}
              className="flex items-center gap-3 hover:bg-gray-50 p-1 rounded-2xl transition-colors active:scale-95"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-500 overflow-hidden border-2 border-white shadow-sm ring-2 ring-indigo-100">
                 <img src={selectedPet.avatar} alt={selectedPet.name} />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1">
                  <h1 className="text-lg font-bold text-gray-900 leading-tight">{selectedPet.name}的日报</h1>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${isPetMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-gray-400 font-mono uppercase tracking-tighter">{selectedPet.breed} · {selectedPet.id}</p>
                  <div className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      dbStatus === 'connected' ? 'bg-green-500' : dbStatus === 'syncing' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'
                    }`}></div>
                    <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                      {dbStatus === 'connected' ? 'InfluxDB Live' : dbStatus === 'syncing' ? 'Syncing' : 'Mock Mode'}
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
                      <img src={pet.avatar} className="w-8 h-8 rounded-full border border-gray-100" alt={pet.name} />
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
            className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            离线补录
          </button>
        </div>
      </div>

      <div className={`max-w-4xl mx-auto px-4 md:px-8 space-y-6 transition-all duration-500 ${loading ? 'opacity-50 blur-[2px]' : 'opacity-100 blur-0'}`}>
        
        {dbStatus === 'error' && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-top-4">
            <div className="bg-red-100 p-2 rounded-xl">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-red-800">数据库连接异常</p>
              <p className="text-[10px] text-red-500">原因: {lastError || "请检查云服务环境变量 INFLUX_URL/TOKEN 是否配置正确。"}</p>
            </div>
          </div>
        )}

        {report && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-transparent hover:border-blue-100 transition-all">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">今日活动 ({dbStatus === 'connected' ? 'InfluxDB' : 'Mock'})</h2>
                  <span className={`text-[10px] px-2.5 py-1 rounded-lg font-bold ${
                    report.activity.activeLevel === 'HIGH' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {report.activity.activeLevel} LEVEL
                  </span>
                </div>
                <div className="flex justify-center">
                  <StepRing steps={report.activity.steps} goal={10000} />
                </div>
              </div>

              <div className={`rounded-[2rem] p-8 shadow-sm transition-all duration-700 border ${
                report.vitals.status === 'WARNING' ? 'bg-orange-50 border-orange-200 shadow-orange-100' : 'bg-white border-transparent'
              }`}>
                <div className="flex justify-between items-start mb-8">
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">实时体征 (SENSORS)</h2>
                  <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                    report.vitals.status === 'WARNING' ? 'bg-orange-500 text-white' : 'bg-green-100 text-green-600'
                  }`}>
                    {report.vitals.status}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-medium">传感器体温</p>
                    <p className={`text-3xl font-bold ${report.vitals.status === 'WARNING' ? 'text-orange-600' : 'text-gray-900'}`}>{report.vitals.avgTemp}°C</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-medium">当前气压</p>
                    <p className="text-3xl font-bold text-gray-900">{report.vitals.avgPressure}<span className="text-xs font-normal text-gray-400 ml-1">hPa</span></p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-medium">相对高度</p>
                    <p className="text-3xl font-bold text-gray-900">{report.vitals.avgHeight}<span className="text-xs font-normal text-gray-400 ml-1">m</span></p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-medium">上报模组</p>
                    <p className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded mt-2 inline-block">LTE-CAT1 + GNSS</p>
                  </div>
                </div>
              </div>
            </div>

            <AISummary report={report} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TrendCard trend={report.trend} />
              <DeviceCard device={report.device} />
            </div>

            <section className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">全天轨迹图谱</h2>
                  <p className="text-xs text-gray-400">来自 InfluxDB 坐标流的实时可视化</p>
                </div>
                <div className="bg-white/80 border border-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded-lg">
                  {report.coordinates.length} 原始点位
                </div>
              </div>
              <div className="h-[450px] w-full bg-white rounded-[2.5rem] overflow-hidden shadow-xl shadow-gray-200/50 border border-gray-100">
                <ActivityMap coordinates={report.coordinates} />
              </div>
            </section>
          </>
        )}
      </div>

      <DataImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={handleImportData} />
    </div>
  );
};

export default App;
