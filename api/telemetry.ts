
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, X-Requested-With',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, s-maxage=0',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { searchParams } = new URL(req.url);
    const petId = searchParams.get('petId') || "221";

    const rawUrl = (process.env.INFLUX_URL || "https://zhouyuaninfo.com.cn/influx").trim().replace(/\/+$/, "");
    const database = (process.env.INFLUX_BUCKET || "pet_health").trim();
    const token = (process.env.INFLUX_TOKEN || "").trim();

    // Direct InfluxQL query for v1.8 compatibility
    const influxQL = `SELECT * FROM pet_activity WHERE tracker_id = '${petId}' ORDER BY time DESC LIMIT 30`;
    const targetUrl = `${rawUrl}/query?db=${encodeURIComponent(database)}&q=${encodeURIComponent(influxQL)}`;
    
    const dbResponse = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PetHealthAPI/1.8',
        ...(token ? { 'Authorization': `Token ${token}` } : {}),
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!dbResponse.ok) {
      const errorText = await dbResponse.text();
      return new Response(JSON.stringify({
        error: "Database request failed",
        status: dbResponse.status,
        details: errorText
      }), { status: dbResponse.status, headers: corsHeaders });
    }

    const data = await dbResponse.json();
    const series = data.results?.[0]?.series?.[0];
    
    if (!series || !series.values || series.values.length === 0) {
      return new Response(JSON.stringify({ 
        _empty: true, 
        message: `No data found in 'pet_activity' for tracker_id '${petId}'. Check if device is reporting.`,
        debug: { table: 'pet_activity', petId }
      }), { status: 200, headers: corsHeaders });
    }

    const getVal = (row: any[], name: string) => {
      const idx = series.columns.indexOf(name);
      return idx !== -1 ? row[idx] : null;
    };

    const latestRow = series.values[0];
    
    // Trajectory extraction
    const coordinates: [number, number][] = series.values
      .map((v: any[]) => [
        parseFloat(getVal(v, 'lat') || 0), 
        parseFloat(getVal(v, 'lng') || 0)
      ] as [number, number])
      .filter(c => c[0] !== 0 && !isNaN(c[0]));

    // Health metrics from Influx fields: step, temp, batvol, press, rsrp, stride
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
        stride: stride > 10 ? stride / 10000 : stride // Handle both mm and m
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
      error: "Edge runtime exception", 
      details: error.message
    }), { status: 500, headers: corsHeaders });
  }
}
