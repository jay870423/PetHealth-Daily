
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  try {
    // 1. 安全解析请求参数
    let petId = "221";
    try {
      const url = new URL(req.url);
      petId = url.searchParams.get('petId') || "221";
    } catch (e) {
      // 如果 req.url 解析失败（某些 Edge 环境下），尝试降级处理
      console.warn("Request URL parsing warning, using fallback petId");
    }

    // 2. 强鲁棒性的环境变量读取 (去除任何可能的隐形成分)
    const rawUrl = (process.env.INFLUX_URL || "https://zhouyuaninfo.com.cn/influx").trim().replace(/\/+$/, "");
    const database = (process.env.INFLUX_BUCKET || "pet_health").trim();
    const token = (process.env.INFLUX_TOKEN || "").trim();

    // 3. 构造查询语句 (InfluxQL 1.x 格式)
    // 确保 tracker_id 匹配正确，增加 LIMIT 确保响应速度
    const influxQL = `SELECT * FROM pet_activity WHERE tracker_id = '${petId}' ORDER BY time DESC LIMIT 20`;
    
    // 4. 使用字符串拼接构造目标 URL (最稳健的方式，避免 Edge Runtime 的 URL 模式匹配错误)
    const targetUrl = `${rawUrl}/query?db=${encodeURIComponent(database)}&q=${encodeURIComponent(influxQL)}`;

    console.debug(`Fetching from InfluxDB: ${rawUrl}/query (petId: ${petId})`);

    // 5. 发起请求
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PetHealthDashboard/1.1',
        ...(token ? { 'Authorization': `Token ${token}` } : {}),
      },
    });

    const responseText = await response.text();

    if (!response.ok) {
      return new Response(JSON.stringify({
        error: `数据库响应异常 (${response.status})`,
        details: responseText.slice(0, 200)
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return new Response(JSON.stringify({ 
        error: "JSON 解析失败", 
        details: responseText.slice(0, 100)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const series = data.results?.[0]?.series?.[0];
    
    // 6. 处理空数据情况
    if (!series || !series.values || series.values.length === 0) {
      return new Response(JSON.stringify({ 
        _empty: true, 
        message: `设备 ${petId} 暂无历史数据` 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const getVal = (row: any[], colName: string) => {
      const idx = series.columns.indexOf(colName);
      return idx !== -1 ? row[idx] : null;
    };

    const latestRow = series.values[0];
    
    // 提取坐标流
    const coords: [number, number][] = series.values
      .map((v: any[]) => {
        const lat = parseFloat(getVal(v, 'lat'));
        const lng = parseFloat(getVal(v, 'lng'));
        return [lat, lng] as [number, number];
      })
      .filter(c => !isNaN(c[0]) && !isNaN(c[1]) && c[0] !== 0);

    // 数据清洗与聚合
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
      trend: { vsYesterday: 0.05, vs7DayAvg: -0.02, trendLabel: 'STABLE' }
    };

    return new Response(JSON.stringify(report), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: "API 系统性异常", 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
