
import { DailyReport } from '../types';

/**
 * 核心映射逻辑：将键值对转换为 DailyReport 结构
 * 增强了表头兼容性
 */
const mapToReport = (rawEntries: Array<Record<string, string>>): Partial<DailyReport> => {
  if (rawEntries.length === 0) return {};

  const allSteps: number[] = [];
  const allTemps: number[] = [];
  const allPressures: number[] = [];
  const allHeights: number[] = [];
  const coords: [number, number][] = [];
  
  let lastBattery = 3.68;
  let lastSpeciesId = 0;
  let lastTrackerId = '';
  let lastTime = new Date().toISOString();
  let lastRsrp = -69;

  rawEntries.forEach(data => {
    // 灵活匹配 Key (不区分大小写，支持部分匹配)
    const findValue = (possibleKeys: string[]) => {
      const foundKey = Object.keys(data).find(k => 
        possibleKeys.some(pk => k.toUpperCase().includes(pk.toUpperCase()))
      );
      return foundKey ? data[foundKey] : undefined;
    };

    const sVal = findValue(['STEP', '计步', '步数']);
    if (sVal) allSteps.push(parseInt(sVal));

    const tVal = findValue(['TEMP', '体温', '温度']);
    if (tVal) allTemps.push(parseFloat(tVal));

    const pVal = findValue(['PRESS', '气压']);
    if (pVal) allPressures.push(parseFloat(pVal));

    const hVal = findValue(['HEIGHT', '高度', '海拔']);
    if (hVal) allHeights.push(parseFloat(hVal));

    // 坐标提取支持多种命名
    const latVal = findValue(['LATITUDE', 'LAT', '纬度']);
    const lngVal = findValue(['LONGITUDE', 'LNG', 'LON', '经度']);
    
    if (latVal && lngVal) {
      const lat = parseFloat(latVal);
      const lng = parseFloat(lngVal);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0) {
        coords.push([lat, lng]);
      }
    }

    const batt = findValue(['BATTVOL', 'BATTERY', '电量', '电压']);
    if (batt) lastBattery = parseFloat(batt);

    const spec = findValue(['SPECIES', '物种', '品种']);
    if (spec) lastSpeciesId = parseInt(spec);

    const tid = findValue(['TRACKERID', 'TID', '设备', 'ID']);
    if (tid) lastTrackerId = tid;

    const time = findValue(['TIME', '时间', '日期']);
    if (time) lastTime = time;

    const rsrp = findValue(['RSRP', '信号']);
    if (rsrp) lastRsrp = parseFloat(rsrp);
  });

  const stepsDelta = allSteps.length > 0 
    ? (Math.max(...allSteps) - Math.min(...allSteps)) 
    : 0;

  const avgTemp = allTemps.length > 0 
    ? allTemps.reduce((a, b) => a + b, 0) / allTemps.length 
    : 38.5;

  const reportUpdate: any = {
    petId: lastTrackerId,
    speciesId: lastSpeciesId,
    activity: {
      steps: stepsDelta || (allSteps.length > 0 ? allSteps[allSteps.length-1] : 0),
      completionRate: stepsDelta ? Math.min(stepsDelta / 10000, 1) : 0,
      activeLevel: stepsDelta > 8000 ? 'HIGH' : stepsDelta > 4000 ? 'NORMAL' : 'LOW',
      stride: 0.45 
    },
    device: {
      battery: lastBattery,
      dataStatus: 'NORMAL',
      rsrp: lastRsrp,
      lastSeen: lastTime
    },
    vitals: {
      avgTemp: parseFloat(avgTemp.toFixed(2)),
      avgPressure: allPressures.length > 0 ? Math.round(allPressures.reduce((a,b)=>a+b,0)/allPressures.length) : 1013,
      avgHeight: allHeights.length > 0 ? Math.round(allHeights.reduce((a,b)=>a+b,0)/allHeights.length) : 0,
      status: (avgTemp > 39.2 || avgTemp < 37.5) ? 'WARNING' : 'NORMAL'
    }
  };

  // 关键：只有当真正解析到坐标时才更新轨迹，否则保留旧轨迹
  if (coords.length > 0) {
    reportUpdate.coordinates = coords;
  }

  return reportUpdate;
};

export const parseExcelText = (text: string): Partial<DailyReport> => {
  const lines = text.split('\n').filter(l => l.trim() !== '');
  if (lines.length < 2) return {};

  // 尝试识别 Tab 或空格分隔
  const header = lines[0].split(/\t|\s{2,}/);
  const dataLines = lines.slice(1);
  
  const entries: Record<string, string>[] = [];
  dataLines.forEach(line => {
    const values = line.split(/\t|\s{2,}/);
    const entry: Record<string, string> = {};
    header.forEach((h, i) => {
      if (values[i]) entry[h.trim()] = values[i].trim();
    });
    if (Object.keys(entry).length > 0) entries.push(entry);
  });

  return entries.length === 0 ? {} : mapToReport(entries);
};

export const parseExcelJson = (json: any[]): Partial<DailyReport> => {
  if (!json || json.length === 0) return {};
  
  // 处理 Excel 常见的“类别/内容”垂直存储结构
  const isVertical = json.some(row => 
    Object.keys(row).some(k => k.includes('类别')) && 
    Object.keys(row).some(k => k.includes('内容'))
  );

  if (isVertical) {
    const entries: Record<string, string>[] = [];
    const entry: Record<string, string> = {};
    json.forEach(row => {
      const keyCol = Object.keys(row).find(k => k.includes('类别'));
      const valCol = Object.keys(row).find(k => k.includes('内容'));
      if (keyCol && valCol) {
        entry[String(row[keyCol]).trim()] = String(row[valCol]).trim();
      }
    });
    entries.push(entry);
    return mapToReport(entries);
  }

  // 处理标准行记录格式
  return mapToReport(json);
};
