
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

    // 如果未配置数据库，直接返回 Mock 数据以供开发预览
    if (!influxUrl) {
      return new Response(JSON.stringify({ 
        _empty: true, 
        message: "数据库未配置，系统已自动加载本地演示轨迹。" 
      }), { status: 200, headers: corsHeaders });
    }

    const query = `SELECT * FROM pet_activity WHERE tracker_id = '${petId}' ORDER BY time DESC LIMIT 100`;
    const queryParams = new URLSearchParams({ db: influxDb, q: query });
    const endpoint = `${influxUrl}/query?${queryParams.toString()}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(influxToken ? { 'Authorization': `Token ${influxToken}` } : {}),
      },
    });

    if (!response.ok) throw new Error(`InfluxDB Error: ${response.status}`);

    const data = await response.json();
    const series = data.results?.[0]?.series?.[0];

    if (!series) {
      return new Response(JSON.stringify({ _empty: true, message: "该时段内未查询到足迹点位数据。" }), { status: 200, headers: corsHeaders });
    }

    const columns = series.columns;
    const latestRow = series.values[0];
    
    // 灵活匹配字段名的函数
    const getVal = (row: any[], keys: string[]) => {
      const idx = columns.findIndex(col => keys.includes(col.toLowerCase()));
      return idx !== -1 ? row[idx] : null;
    };

    // 坐标序列解析：支持 lat, latitude, lng, longitude
    const coordinates: [number, number][] = series.values
      .map((v: any[]) => {
        const lat = parseFloat(getVal(v, ['lat', 'latitude', '纬度']) || 0);
        const lng = parseFloat(getVal(v, ['lng', 'lon', 'longitude', '经度']) || 0);
        return [lat, lng] as [number, number];
      })
      .filter(c => !isNaN(c[0]) && c[0] !== 0);

    const steps = Math.round(Number(getVal(latestRow, ['step', 'steps', '步数']) || 0));
    const avgTemp = parseFloat(Number(getVal(latestRow, ['temp', 'temperature', '体温']) || 38.5).toFixed(2));
    const battery = parseFloat(Number(getVal(latestRow, ['batvol', 'battery', '电压']) || 3.7).toFixed(2));
    
    const report = {
      date: new Date().toISOString().split('T')[0],
      petId,
      speciesId: parseInt(getVal(latestRow, ['species_id', 'species']) || "1"),
      activity: {
        steps,
        completionRate: parseFloat((steps / 10000).toFixed(2)),
        activeLevel: steps > 8000 ? 'HIGH' : steps > 4000 ? 'NORMAL' : 'LOW',
        stride: 0.45
      },
      vitals: {
        avgTemp,
        avgPressure: Math.round(Number(getVal(latestRow, ['press', 'pressure']) || 1013)),
        avgHeight: Math.round(Number(getVal(latestRow, ['height', 'altitude']) || 0)), 
        status: (avgTemp > 39.2 || avgTemp < 37.5) ? 'WARNING' : 'NORMAL'
      },
      device: {
        battery,
        dataStatus: battery < 3.65 ? 'DEGRADED' : 'NORMAL',
        rsrp: Math.round(Number(getVal(latestRow, ['rsrp', 'signal']) || -70)),
        lastSeen: getVal(latestRow, ['time', 'timestamp']) || new Date().toISOString()
      },
      coordinates: coordinates.length > 0 ? coordinates : [[31.2304, 121.4737]],
      trend: { vsYesterday: -0.05, vs7DayAvg: 0.02, trendLabel: 'STABLE' }
    };

    return new Response(JSON.stringify(report), { status: 200, headers: corsHeaders });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
}
