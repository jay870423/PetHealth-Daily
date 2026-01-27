
import { DailyReport, ActivityStats, VitalStats, TrendStats, DeviceStats } from '../types';

export const generateDailyReport = (petId: string): DailyReport => {
  const now = new Date();
  const idNum = parseInt(petId) || 0;
  
  const seed = idNum / 1000;
  const baseLat = 31.2304 + (seed % 0.05);
  const baseLng = 121.4737 + (seed % 0.05);
  
  const coordinates: [number, number][] = Array.from({ length: 12 }, (_, i) => [
    baseLat + (Math.sin(i + idNum) * 0.005),
    baseLng + (Math.cos(i + idNum) * 0.005)
  ]);

  const baseSteps = petId === "221" ? 6312 : petId === "105" ? 8420 : 3100;
  const steps = baseSteps + Math.floor(Math.random() * 200);
  const targetSteps = 10000;

  const activity: ActivityStats = {
    steps: steps,
    completionRate: parseFloat((steps / targetSteps).toFixed(2)),
    activeLevel: steps > 8000 ? 'HIGH' : steps > 4000 ? 'NORMAL' : 'LOW',
    stride: petId === "221" ? 0.45 : petId === "105" ? 0.65 : 0.35
  };

  const avgTemp = petId === "302" ? 39.1 : 38.2 + (Math.random() * 0.5);
  const vitals: VitalStats = {
    avgTemp: parseFloat(avgTemp.toFixed(2)),
    avgPressure: 1013 + Math.floor(Math.random() * 10),
    avgHeight: 12.5 + (idNum % 5),
    status: avgTemp > 39.0 ? 'WARNING' : 'NORMAL'
  };

  const trend: TrendStats = {
    vsYesterday: petId === "221" ? -0.18 : 0.12,
    vs7DayAvg: petId === "221" ? 0.05 : -0.02,
    trendLabel: petId === "221" ? 'DOWN' : 'UP'
  };

  const device: DeviceStats = {
    dataStatus: 'NORMAL',
    battery: 3.82 - (idNum % 0.5),
    rsrp: -72 - (idNum % 10),
    lastSeen: new Date().toISOString()
  };

  return {
    date: now.toISOString().split('T')[0],
    petId: petId,
    speciesId: petId === "302" ? 2 : 1, // 302 is Cola (Cat), others Dog
    summary: petId === "221" ? "今天活动量略有下降，但整体体征平稳。" : "今天非常活跃，完成了大部分运动目标！",
    activity,
    vitals,
    trend,
    device,
    advice: petId === "221" ? [
      "建议增加一次 15-30 分钟互动活动",
      "连续观察 2-3 天活动变化"
    ] : [
      "由于今天活跃度高，建议多补充水分",
      "检查脚垫是否有磨损"
    ],
    coordinates
  };
};
