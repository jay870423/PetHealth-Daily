
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

    // 环境变量校验与清洗
    const rawInfluxUrl = process.env.INFLUX_URL || "";
    const influxUrl = rawInfluxUrl.trim().replace(/\/+$/, "");
    const influxDb = (process.env.INFLUX_BUCKET || "pet_health").trim();
    const influxToken = (process.env.INFLUX_TOKEN || "").trim();

    if (!influxUrl) {
      return new Response(JSON.stringify({ 
        error: "Configuration Error", 
        message: "环境变量 INFLUX_URL 未配置。请在 Vercel Settings -> Environment Variables 中添加。" 
      }), { status: 500, headers: corsHeaders });
    }

    // 构建查询语句
    const query = `SELECT * FROM pet_activity WHERE tracker_id = '${petId}' ORDER BY time DESC LIMIT 30`;
    const queryParams = new URLSearchParams({
      db: influxDb,
      q: query
    });
    
    const endpoint = `${influxUrl}/query?${queryParams.toString()}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(influxToken ? { 'Authorization': `Token ${influxToken}` } : {}),
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({
        error: "InfluxDB Query Failed",
        status: response.status,
        message: errorText || "数据库连接失败"
      }), { status: response.status, headers: corsHeaders });
    }

    const data = await response.json();
    const series = data.results?.[0]?.series?.[0];

    if (!series || !series.values || series.values.length === 0) {
      return new Response(JSON.stringify({ 
        _empty: true, 
        message: `设备 ${petId} 当前无在线数据，已自动切换至模拟演示模式。` 
      }), { status: 200, headers: corsHeaders });
    }

    const columns = series.columns;
    const latestRow = series.values[0];
    const getVal = (row: any[], name: string) => {
      const idx = columns.indexOf(name);
      return idx !== -1 ? row[idx] : null;
    };

    // 坐标序列解析
    const coordinates: [number, number][] = series.values
      .map((v: any[]) => [
        parseFloat(getVal(v, 'lat') || 0), 
        parseFloat(getVal(v, 'lng') || 0)
      ] as [number, number])
      .filter(c => !isNaN(c[0]) && c[0] !== 0);

    const steps = Math.round(Number(getVal(latestRow, 'step') || 0));
    const avgTemp = parseFloat(Number(getVal(latestRow, 'temp') || 38.5).toFixed(2));
    const battery = parseFloat(Number(getVal(latestRow, 'batvol') || 3.7).toFixed(2));
    const pressure = Math.round(Number(getVal(latestRow, 'press') || 1013));
    const rsrp = Math.round(Number(getVal(latestRow, 'rsrp') || -70));
    const stride = parseFloat(Number(getVal(latestRow, 'stride') || 0.45).toFixed(2));

    const report = {
      date: new Date().toISOString().split('T')[0],
      petId,
      speciesId: parseInt(getVal(latestRow, 'species_id') || "1"),
      activity: {
        steps,
        completionRate: parseFloat((steps / 10000).toFixed(2)),
        activeLevel: steps > 8000 ? 'HIGH' : steps > 4000 ? 'NORMAL' : 'LOW',
        stride: stride > 10 ? stride / 10000 : stride
      },
      vitals: {
        avgTemp,
        avgPressure: pressure,
        avgHeight: 0, 
        status: (avgTemp > 39.2 || avgTemp < 37.5) ? 'WARNING' : 'NORMAL'
      },
      device: {
        battery,
        dataStatus: battery < 3.65 ? 'DEGRADED' : 'NORMAL',
        rsrp,
        lastSeen: getVal(latestRow, 'time') || new Date().toISOString()
      },
      coordinates: coordinates.length > 0 ? coordinates : [[31.2304, 121.4737]],
      trend: { vsYesterday: 0, vs7DayAvg: 0, trendLabel: 'STABLE' }
    };

    return new Response(JSON.stringify(report), { status: 200, headers: corsHeaders });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: "Edge Function Runtime Error", 
      message: error.message 
    }), { status: 500, headers: corsHeaders });
  }
}
