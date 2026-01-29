
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

    // 环境变量获取，确保去除多余空格和斜杠
    const influxUrl = (process.env.INFLUX_URL || "").trim().replace(/\/+$/, "");
    const influxDb = (process.env.INFLUX_BUCKET || "pet_health").trim();
    const influxToken = (process.env.INFLUX_TOKEN || "").trim();

    // 如果没有配置 URL，说明环境变量未同步，这通常是部署初期最常见的问题
    if (!influxUrl) {
      return new Response(JSON.stringify({ 
        error: "Configuration Error", 
        message: "INFLUX_URL 环境参数缺失，请在 Vercel 项目设置中检查配置。" 
      }), { status: 500, headers: corsHeaders });
    }

    // 构建查询
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

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`[InfluxDB Error] Status: ${response.status}`, responseText);
      return new Response(JSON.stringify({
        error: "Database Query Failed",
        status: response.status,
        message: responseText.slice(0, 500)
      }), { status: response.status, headers: corsHeaders });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return new Response(JSON.stringify({ 
        error: "Invalid DB Response", 
        message: "数据库返回的不是有效的 JSON 格式。" 
      }), { status: 500, headers: corsHeaders });
    }

    const series = data.results?.[0]?.series?.[0];
    if (!series || !series.values || series.values.length === 0) {
      return new Response(JSON.stringify({ 
        _empty: true, 
        message: `未找到 ID 为 ${petId} 的设备数据` 
      }), { status: 200, headers: corsHeaders });
    }

    const columns = series.columns;
    const latestRow = series.values[0];
    const getVal = (row: any[], name: string) => {
      const idx = columns.indexOf(name);
      return idx !== -1 ? row[idx] : null;
    };

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
      error: "Edge Function Error", 
      message: error.message 
    }), { status: 500, headers: corsHeaders });
  }
}
