
export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  const { petId } = req.query;

  const url = process.env.INFLUX_URL;
  const token = process.env.INFLUX_TOKEN;
  const database = process.env.INFLUX_BUCKET; // 1.8 中 Bucket 对应 Database

  // 1. 严格检查环境变量
  if (!url || !database) {
    return res.status(500).json({ 
      error: "环境变量缺失: 请确保配置了 INFLUX_URL 和 INFLUX_BUCKET (作为数据库名)。" 
    });
  }

  /**
   * 2. 构建 InfluxQL 查询 (适配 1.8)
   * 查询 1: 计算今日累计步数 (max-min) 和体征平均值
   * 查询 2: 获取最新的设备状态 (电池、信号、位置)
   * 查询 3: 获取今日轨迹点
   */
  const influxQL = [
    `SELECT MAX("step") - MIN("step") AS "steps", MEAN("temp") AS "temp", MEAN("press") AS "pressure" FROM "pet_activity" WHERE "tracker_id" = '${petId}' AND time > now() - 24h`,
    `SELECT LAST("batvol") AS "battery", LAST("rsrp") AS "rsrp", LAST("lat") AS "lat", LAST("lng") AS "lng", LAST("step") AS "last_step" FROM "pet_activity" WHERE "tracker_id" = '${petId}'`,
    `SELECT "lat", "lng" FROM "pet_activity" WHERE "tracker_id" = '${petId}' AND time > now() - 24h`
  ].join(';');

  const queryUrl = `${url}/query?db=${encodeURIComponent(database)}&q=${encodeURIComponent(influxQL)}`;

  try {
    console.log(`Executing InfluxQL for petId: ${petId}`);
    
    const response = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        // 如果 1.8 配置了 Token (通常通过 InfluxDB 2.0 兼容层或代理)，则带上
        ...(token ? { 'Authorization': `Token ${token}` } : {}),
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`InfluxDB 响应异常 (${response.status}): ${errText}`);
    }

    const data = await response.json();
    
    // 解析 InfluxQL 多语句返回结果
    const results = data.results;
    if (!results || results[0].error) {
      throw new Error(results?.[0]?.error || "查询未返回有效结果");
    }

    // 提取聚合数据 (Result 0)
    const summaryData = results[0].series?.[0]?.values?.[0] || [];
    const summaryCols = results[0].series?.[0]?.columns || [];
    const getSummaryVal = (colName: string) => summaryData[summaryCols.indexOf(colName)];

    // 提取最新状态 (Result 1)
    const latestData = results[1].series?.[0]?.values?.[0] || [];
    const latestCols = results[1].series?.[0]?.columns || [];
    const getLatestVal = (colName: string) => latestData[latestCols.indexOf(colName)];

    // 提取轨迹点 (Result 2)
    const traceSeries = results[2].series?.[0];
    const coords: [number, number][] = [];
    if (traceSeries) {
      const latIdx = traceSeries.columns.indexOf('lat');
      const lngIdx = traceSeries.columns.indexOf('lng');
      traceSeries.values.forEach((v: any[]) => {
        if (v[latIdx] && v[lngIdx]) {
          coords.push([parseFloat(v[latIdx]), parseFloat(v[lngIdx])]);
        }
      });
    }

    if (summaryData.length === 0 && latestData.length === 0) {
      return res.status(404).json({ error: `未找到 ID 为 ${petId} 的宠物数据。` });
    }

    // 3. 构造符合文档规范的 Report 对象
    const steps = Math.round(getSummaryVal('steps') || getLatestVal('last_step') || 0);
    const avgTemp = parseFloat((getSummaryVal('temp') || 38.5).toFixed(2));
    const battery = parseFloat((getLatestVal('battery') || 3.7).toFixed(2));

    const report = {
      date: new Date().toISOString().split('T')[0],
      petId: petId,
      speciesId: 1, // 默认为狗，实际可从 tag 或配置获取
      activity: {
        steps: steps,
        completionRate: parseFloat((steps / 10000).toFixed(2)),
        activeLevel: steps > 8000 ? 'HIGH' : steps > 4000 ? 'NORMAL' : 'LOW',
        stride: 0.45
      },
      vitals: {
        avgTemp: avgTemp,
        avgPressure: Math.round(getSummaryVal('pressure') || 1013),
        avgHeight: 0, // 1.8 模拟中未包含高度字段
        status: (avgTemp > 39.2 || avgTemp < 37.5) ? 'WARNING' : 'NORMAL'
      },
      device: {
        battery: battery,
        dataStatus: battery < 3.65 ? 'DEGRADED' : 'NORMAL',
        rsrp: Math.round(getLatestVal('rsrp') || -70),
        lastSeen: getLatestVal('time') || new Date().toISOString()
      },
      coordinates: coords,
      trend: {
        vsYesterday: 0.05,
        vs7DayAvg: -0.02,
        trendLabel: 'STABLE'
      }
    };

    res.status(200).json(report);
  } catch (error: any) {
    console.error("InfluxDB 1.8 Fetch Error:", error.message);
    res.status(500).json({ error: `InfluxDB 查询错误: ${error.message}` });
  }
}
