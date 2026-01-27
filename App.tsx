
import React, { useState, useEffect } from 'react';
import StepRing from './components/StepRing';
import ActivityMap from './components/ActivityMap';
import AISummary from './components/AISummary';
import TrendCard from './components/TrendCard';
import DeviceCard from './components/DeviceCard';
import DataImportModal from './components/DataImportModal';
import { generateDailyReport } from './services/mockData';
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

  const selectedPet = PETS.find(p => p.id === selectedPetId) || PETS[0];

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      const data = generateDailyReport(selectedPetId);
      setReport(data);
      setLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [selectedPetId]);

  const handleImportData = (updatedFields: Partial<DailyReport>) => {
    if (!report) return;
    
    setReport(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        ...updatedFields,
        activity: { ...prev.activity, ...(updatedFields.activity || {}) },
        vitals: { ...prev.vitals, ...(updatedFields.vitals || {}) },
        device: { ...prev.device, ...(updatedFields.device || {}) },
        coordinates: updatedFields.coordinates || prev.coordinates
      };
    });
  };

  const getSpeciesLabel = (sid: number) => {
    if (sid === 1) return "小狗模式";
    if (sid === 2) return "小猫模式";
    return "智能模式";
  };

  if (!report && !loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-gray-400">
      <div className="animate-bounce mb-4 text-4xl">🐾</div>
      <p className="font-medium">正在连接宠物云端...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-12">
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
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] text-gray-400 font-mono uppercase tracking-tighter">{selectedPet.breed} · {report?.petId || selectedPet.id}</p>
                  {report && (
                    <span className="bg-indigo-50 text-indigo-500 text-[8px] px-1.5 py-0.5 rounded font-black tracking-widest uppercase">
                      {getSpeciesLabel(report.speciesId)}
                    </span>
                  )}
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
                      onClick={() => {
                        setSelectedPetId(pet.id);
                        setIsPetMenuOpen(false);
                      }}
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
            同步 Excel 数据
          </button>
        </div>
      </div>

      <div className={`max-w-4xl mx-auto px-4 md:px-8 space-y-6 transition-all duration-500 ${loading ? 'opacity-30 scale-[0.98]' : 'opacity-100 scale-100'}`}>
        {report && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-transparent hover:border-blue-100 transition-all">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">今日活动 (DELTA)</h2>
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
                report.vitals.status === 'WARNING' 
                  ? 'bg-orange-50 border-orange-200 shadow-orange-100' 
                  : 'bg-white border-transparent'
              }`}>
                <div className="flex justify-between items-start mb-8">
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">体征与环境 (VITALS)</h2>
                  <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                    report.vitals.status === 'WARNING' ? 'bg-orange-500 text-white' : 'bg-green-100 text-green-600'
                  }`}>
                    {report.vitals.status === 'WARNING' && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    )}
                    {report.vitals.status}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-medium">平均体温</p>
                    <p className={`text-3xl font-bold ${report.vitals.status === 'WARNING' ? 'text-orange-600' : 'text-gray-900'}`}>
                      {report.vitals.avgTemp}°C
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-medium">气压</p>
                    <p className="text-3xl font-bold text-gray-900">{report.vitals.avgPressure}<span className="text-xs font-normal text-gray-400 ml-1">hPa</span></p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-medium">当前海拔</p>
                    <p className="text-3xl font-bold text-gray-900">{report.vitals.avgHeight}<span className="text-xs font-normal text-gray-400 ml-1">m</span></p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-medium">地理围栏</p>
                    <p className="text-[10px] font-mono text-gray-400 mt-2 truncate">
                      {report.coordinates[0]?.[0].toFixed(4)}N, {report.coordinates[0]?.[1].toFixed(4)}E
                    </p>
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
                  <p className="text-xs text-gray-400">基于 GPS 与 LBS 混合定位生成的足迹</p>
                </div>
                <div className="flex items-center gap-2">
                   <div className="bg-white/80 border border-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded-lg">
                      {report.coordinates.length} 采集点
                   </div>
                   <div className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-1 rounded-lg tracking-widest uppercase">Precision GL</div>
                </div>
              </div>
              <div className="h-[450px] w-full bg-white rounded-[2.5rem] overflow-hidden shadow-xl shadow-gray-200/50 border border-gray-100 relative">
                <ActivityMap coordinates={report.coordinates} />
              </div>
            </section>
          </>
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
