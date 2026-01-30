
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, s-maxage=0',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const petId = url.searchParams.get('petId') || "221";

    const influxUrl = (process.env.INFLUX_URL || "").trim().replace(/\/+$/, "");
    const influxDb = (process.env.INFLUX_BUCKET || "pet_health").trim();
    const influxToken = (process.env.INFLUX_TOKEN || "").trim();

    if (!influxUrl) {
      return new Response(JSON.stringify({ 
        _empty: true, 
        message: "环境配置缺失 (INFLUX_URL 未配置)" 
      }), { status: 200, headers: corsHeaders });
    }

    // 统计周期：Asia/Shanghai (UTC+8)
    // 简化处理：获取服务器当前时间的今日 00:00:00 和 昨日 00:00:00
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const last7Days = new Date(today.getTime() - 7 * 86400000);

    const todayISO = today.toISOString();
    const yesterdayISO = yesterday.toISOString();
    const last7DaysISO = last7Days.toISOString();

    /**
     * 设计文档要求：
     * 1. Activity: dailySteps = max(STEP) - min(STEP)
     * 2. Vitals: avgTemp = mean(TEMP), avgPressure = mean(PRESS)
     * 3. Trend: vsYesterday = (todaySteps - yesterdaySteps) / yesterdaySteps
     */
    const queries = [
      // Q0: 今日数据聚合
      `SELECT MAX(STEP) as max_step, MIN(STEP) as min_step, MEAN(TEMP) as avg_temp, MEAN(PRESS) as avg_press, LAST(BATVOL) as battery, LAST(RSRP) as rsrp, LAST(STEP) as last_step FROM pet_activity WHERE tracker_id = '${petId}' AND time >= '${todayISO}'`,
      // Q1: 昨日步数聚合
      `SELECT MAX(STEP) as max_step, MIN(STEP) as min_step FROM pet_activity WHERE tracker_id = '${petId}' AND time >= '${yesterdayISO}' AND time < '${todayISO}'`,
      // Q2: 过去7日步数聚合 (用于计算7日均值)
      `SELECT MAX(STEP) as max_step, MIN(STEP) as min_step FROM pet_activity WHERE tracker_id = '${petId}' AND time >= '${last7DaysISO}' GROUP BY time(1d) FILL(0)`,
      // Q3: 实时轨迹点 (最新 100 点)
      `SELECT LAT, LNG FROM pet_activity WHERE tracker_id = '${petId}' AND time >= '${todayISO}' ORDER BY time DESC LIMIT 100`
    ];

    const fullQuery = queries.join(';');
    const queryParams = new URLSearchParams({ db: influxDb, q: fullQuery, epoch: 'ms' });
    const endpoint = `${influxUrl}/query?${queryParams.toString()}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(influxToken ? { 'Authorization': `Token ${influxToken}` } : {}),
      },
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`InfluxDB HTTP ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    const results = data.results || [];

    // --- 解析今日数据 (Q0) ---
    const q0 = results[0]?.series?.[0];
    const todayMap = q0 ? Object.fromEntries(q0.columns.map((c, i) => [c, q0.values[0][i]])) : {};
    const todaySteps = Math.max((Number(todayMap.max_step) || 0) - (Number(todayMap.min_step) || 0), 0);
    const avgTemp = parseFloat(Number(todayMap.avg_temp || 38.5).toFixed(2));
    const battery = parseFloat(Number(todayMap.battery || 3.7).toFixed(2));
    const rsrp = Math.round(Number(todayMap.rsrp || -70));
    const lastSeenMs = todayMap.time || Date.now();

    // --- 解析昨日数据 (Q1) ---
    const q1 = results[1]?.series?.[0];
    const yesterdayMap = q1 ? Object.fromEntries(q1.columns.map((c, i) => [c, q1.values[0][i]])) : {};
    const yesterdaySteps = Math.max((Number(yesterdayMap.max_step) || 0) - (Number(yesterdayMap.min_step) || 0), 0);
    const vsYesterday = yesterdaySteps > 0 ? (todaySteps - yesterdaySteps) / yesterdaySteps : 0;

    // --- 解析7日均值 (Q2) ---
    const q2 = results[2]?.series?.[0];
    let avg7DaySteps = 0;
    if (q2) {
      const dailyStepsList = q2.values.map(v => {
        // InfluxDB GROUP BY time(1d) results
        const maxIdx = q2.columns.indexOf('max_step');
        const minIdx = q2.columns.indexOf('min_step');
        return Math.max((v[maxIdx] || 0) - (v[minIdx] || 0), 0);
      });
      avg7DaySteps = dailyStepsList.reduce((a, b) => a + b, 0) / (dailyStepsList.length || 1);
    }
    const vs7DayAvg = avg7DaySteps > 0 ? (todaySteps - avg7DaySteps) / avg7DaySteps : 0;

    // --- 解析轨迹 (Q3) ---
    const q3 = results[3]?.series?.[0];
    const coordinates: [number, number][] = q3 
      ? q3.values.map(v => [v[q3.columns.indexOf('LAT')], v[q3.columns.indexOf('LNG')]])
          .filter(c => c[0] && c[1] && !isNaN(c[0]))
      : [[31.2304, 121.4737]];

    // --- 状态判定 (设计文档 6.4) ---
    const isOffline = (Date.now() - lastSeenMs) > 10 * 60 * 1000;
    let dataStatus: 'NORMAL' | 'DEGRADED' | 'OFFLINE' = 'NORMAL';
    if (isOffline) dataStatus = 'OFFLINE';
    else if (battery < 3.65 || rsrp < -105) dataStatus = 'DEGRADED';

    const report = {
      date: todayISO.split('T')[0],
      petId,
      summary: todaySteps < 4000 ? "今天活动偏少，建议多动动哦。" : "表现很棒，继续保持！",
      activity: {
        steps: todaySteps,
        completionRate: parseFloat((todaySteps / 10000).toFixed(2)),
        activeLevel: todaySteps > 8000 ? 'HIGH' : todaySteps > 4000 ? 'NORMAL' : 'LOW'
      },
      vitals: {
        avgTemp,
        avgPressure: Math.round(Number(todayMap.avg_press || 1013)),
        status: (avgTemp > 39.2 || avgTemp < 37.5) ? 'WARNING' : 'NORMAL'
      },
      trend: {
        vsYesterday: parseFloat(vsYesterday.toFixed(2)),
        vs7DayAvg: parseFloat(vs7DayAvg.toFixed(2)),
        trendLabel: vsYesterday > 0.1 ? 'UP' : vsYesterday < -0.1 ? 'DOWN' : 'STABLE'
      },
      device: {
        dataStatus,
        battery,
        rsrp,
        lastSeen: new Date(lastSeenMs).toISOString()
      },
      advice: [
        todaySteps < 4000 ? "建议增加一次 15-30 分钟互动活动" : "状态不错，可以奖励一个小零食",
        vsYesterday < -0.2 ? "连续观察 2-3 天活动变化" : "保持目前的运动节奏"
      ],
      coordinates
    };

    return new Response(JSON.stringify(report), { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error("Telemetry Edge Error:", error.message);
    return new Response(JSON.stringify({ 
      error: "Internal Server Error", 
      message: error.message,
      _empty: true 
    }), { status: 500, headers: corsHeaders });
  }
}
