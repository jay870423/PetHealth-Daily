
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const petId = url.searchParams.get('petId');

    if (!petId) {
      return new Response(JSON.stringify({ error: "缺少 petId 参数" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 关键修复：去除环境变量两端的空格和换行符，防止 new URL() 抛出 "string did not match pattern"
    const rawUrl = (process.env.INFLUX_URL || "").trim();
    const database = (process.env.INFLUX_BUCKET || "pet_health").trim();
    const token = (process.env.INFLUX_TOKEN || "").trim();

    // 基础验证
    if (!rawUrl || !rawUrl.startsWith('http')) {
      return new Response(JSON.stringify({ 
        error: "服务器配置异常", 
        details: `INFLUX_URL 配置缺失或格式错误（需以 http 开头）` 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 规范化 URL 拼接
    const baseUrl = rawUrl.replace(/\/+$/, "");
    
    // 显式捕获 URL 构造错误
    let targetUrlString: string;
    try {
      const targetUrl = new URL(`${baseUrl}/query`);
      targetUrl.searchParams.append('db', database);
      // 注意：InfluxQL 中的特殊字符需要被正确编码
      const influxQL = `SELECT * FROM "pet_activity" WHERE "tracker_id" = '${petId}' ORDER BY time DESC LIMIT 20`;
      targetUrl.searchParams.append('q', influxQL);
      targetUrlString = targetUrl.toString();
    } catch (e) {
      return new Response(JSON.stringify({ 
        error: "URL 构造失败", 
        details: `无法基于 "${baseUrl}" 构造有效请求地址`
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 发起数据请求
    const response = await fetch(targetUrlString, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PetHealthDashboard/1.0',
        ...(token ? { 'Authorization': `Token ${token}` } : {}),
      },
    });

    const responseText = await response.text();

    if (!response.ok) {
      return new Response(JSON.stringify({
        error: `InfluxDB 响应异常 (${response.status})`,
        details: responseText.slice(0, 150)
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
        error: "解析数据库 JSON 失败", 
        details: responseText.slice(0, 100)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const series = data.results?.[0]?.series?.[0];
    
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
    const coords: [number, number][] = series.values
      .map((v: any[]) => {
        const lat = parseFloat(getVal(v, 'lat'));
        const lng = parseFloat(getVal(v, 'lng'));
        return [lat, lng] as [number, number];
      })
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
    console.error("Critical API Error:", error);
    return new Response(JSON.stringify({ 
      error: "API 内部处理异常", 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
