
export interface Pet {
  id: string;
  name: string;
  avatar: string;
  breed: string;
}

export type AiProvider = 'gemini' | 'deepseek' | 'qwen';

export interface ActivityStats {
  steps: number;
  completionRate: number;
  activeLevel: 'LOW' | 'NORMAL' | 'HIGH';
  // stride is used to track the movement characteristics of different pets
  stride?: number;
}

export interface VitalStats {
  avgTemp: number;
  avgPressure?: number;
  avgHeight?: number;
  status: 'NORMAL' | 'WARNING';
}

export interface TrendStats {
  vsYesterday: number;
  vs7DayAvg: number;
  trendLabel: 'UP' | 'STABLE' | 'DOWN';
}

export interface DeviceStats {
  dataStatus: 'NORMAL' | 'DEGRADED' | 'OFFLINE';
  battery: number;
  rsrp: number;
  lastSeen: string;
}

export interface DailyReport {
  date: string;
  petId: string;
  summary: string;
  activity: ActivityStats;
  vitals: VitalStats;
  trend: TrendStats;
  device: DeviceStats;
  advice: string[];
  coordinates: [number, number][];
  speciesId?: number;
}