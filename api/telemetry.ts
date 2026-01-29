
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, s-maxage=0',
  };

  // 处理 Preflight 请求
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { searchParams } = new URL(req.url);
    const petId = searchParams.get('petId') || "221";

    const rawUrl = (process.env.INFLUX_URL || "https://zhouyuaninfo.com.cn/influx").trim().replace(/\/+$/, "");
    const database = (process.env.INFLUX_BUCKET || "pet_health").trim();
    const token = (process.env.INFLUX_TOKEN || "").trim();

    const influxQL = `SELECT * FROM pet_activity WHERE tracker_id = '${petId}' ORDER BY time DESC LIMIT 20`;
    const targetUrl = `${rawUrl}/query?db=${encodeURIComponent(database)}&q=${encodeURIComponent(influxQL)}`;
    
    const dbResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PetHealthAPI/1.4',
        ...(token ? { 'Authorization': `Token ${token}` } : {}),
      },
      signal: AbortSignal.timeout(10000) // 增加超时机制
    });

    const bodyText = await dbResponse.text();

    if (!dbResponse.ok) {
      return new Response(JSON.stringify({
        error: "数据库访问失败",
        details: `InfluxDB Status: ${dbResponse.status}`
      }), { status: dbResponse.status, headers: corsHeaders });
    }

    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (e) {
      return new Response(JSON.stringify({
        error: "数据库格式异常",
        details: "Invalid JSON response from InfluxDB"
      }), { status: 500, headers: corsHeaders });
    }

    const series = data.results?.[0]?.series?.[0];
    
    if (!series || !series.values || series.values.length === 0) {
      return new Response(JSON.stringify({ 
        _empty: true, 
        message: `终端 ${petId} 目前处于离线状态或暂无报文` 
      }), { status: 200, headers: corsHeaders });
    }

    const getVal = (row: any[], colName: string) => {
      const idx = series.columns.indexOf(colName);
      return idx !== -1 ? row[idx] : null;
    };

    const latestRow = series.values[0];
    const coords: [number, number][] = series.values
      .map((v: any[]) => [parseFloat(getVal(v, 'lat')), parseFloat(getVal(v, 'lng'))] as [number, number])
      .filter(c => !isNaN(c[0]) && !isNaN(c[1]) && c[0] !== 0);

    const steps = Math.round(Number(getVal(latestRow, 'step') || 0));
    const avgTemp = parseFloat(Number(getVal(latestRow, 'temp') || 38.5).toFixed(2));
    const battery = parseFloat(Number(getVal(latestRow, 'batvol') || 3.75).toFixed(2));

    const report = {
      date: new Date().toISOString().split('T')[0],
      petId,
      activity: {
        steps,
        completionRate: parseFloat((steps / 10000).toFixed(2)),
        activeLevel: steps > 8000 ? 'HIGH' : steps > 4000 ? 'NORMAL' : 'LOW',
        stride: 0.45
      },
      vitals: {
        avgTemp,
        avgPressure: Math.round(Number(getVal(latestRow, 'press') || 1013)),
        avgHeight: Math.round(Number(getVal(latestRow, 'height') || 0)),
        status: (avgTemp > 39.2 || avgTemp < 37.5) ? 'WARNING' : 'NORMAL'
      },
      device: {
        battery,
        dataStatus: battery < 3.65 ? 'DEGRADED' : 'NORMAL',
        rsrp: Math.round(Number(getVal(latestRow, 'rsrp') || -70)),
        lastSeen: getVal(latestRow, 'time') || new Date().toISOString()
      },
      coordinates: coords.length > 0 ? coords : [[31.2304, 121.4737]],
      trend: { vsYesterday: 0.05, vs7DayAvg: -0.01, trendLabel: 'STABLE' }
    };

    return new Response(JSON.stringify(report), { status: 200, headers: corsHeaders });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: "Edge Function Runtime Error", 
      details: error.message
    }), { status: 500, headers: corsHeaders });
  }
}
