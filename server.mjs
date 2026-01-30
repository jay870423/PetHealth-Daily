
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'dist')));

app.get('/api/telemetry', async (req, res) => {
  try {
    const petId = req.query.petId || "221";
    const rawInfluxUrl = process.env.INFLUX_URL || "";
    const influxUrl = rawInfluxUrl.trim().replace(/\/+$/, "");
    const influxDb = (process.env.INFLUX_BUCKET || "pet_health").trim();
    const influxToken = (process.env.INFLUX_TOKEN || "").trim();

    if (!influxUrl) {
      return res.status(500).json({ error: "Config Error", message: "INFLUX_URL is not configured" });
    }

    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const todayISO = todayStart.toISOString();

    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const yesterdayISO = yesterdayStart.toISOString();

    // 组合查询语句，对齐 Edge 端的逻辑
    const queries = [
      `SELECT MAX(STEP) as max_step, MIN(STEP) as min_step, MEAN(TEMP) as avg_temp, LAST(BATVOL) as battery, LAST(RSRP) as rsrp, LAST(STEP) as last_step FROM pet_activity WHERE tracker_id = '${petId}' AND time >= '${todayISO}'`,
      `SELECT MAX(STEP) as max_step, MIN(STEP) as min_step FROM pet_activity WHERE tracker_id = '${petId}' AND time >= '${yesterdayISO}' AND time < '${todayISO}'`,
      `SELECT LAT, LNG FROM pet_activity WHERE tracker_id = '${petId}' AND time >= '${todayISO}' ORDER BY time DESC LIMIT 50`
    ];

    const q = queries.join(';');
    const endpoint = `${influxUrl}/query?db=${encodeURIComponent(influxDb)}&q=${encodeURIComponent(q)}&epoch=ms`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(influxToken ? { 'Authorization': `Token ${influxToken}` } : {}),
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: "InfluxDB Error", detail: errText });
    }

    const data = await response.json();
    const results = data.results || [];

    // 解析今日 (Q0)
    const todaySeries = results[0]?.series?.[0];
    if (!todaySeries) {
      return res.json({ _empty: true, message: "No data today" });
    }
    const todayMap = Object.fromEntries(todaySeries.columns.map((c, i) => [c, todaySeries.values[0][i]]));
    const todaySteps = Math.max((Number(todayMap.max_step) || 0) - (Number(todayMap.min_step) || 0), 0);
    
    // 解析昨日 (Q1)
    const yesterdaySeries = results[1]?.series?.[0];
    const yesterdayMap = yesterdaySeries ? Object.fromEntries(yesterdaySeries.columns.map((c, i) => [c, yesterdaySeries.values[0][i]])) : {};
    const yesterdaySteps = Math.max((Number(yesterdayMap.max_step) || 0) - (Number(yesterdayMap.min_step) || 0), 0);
    const vsYesterday = yesterdaySteps > 0 ? (todaySteps - yesterdaySteps) / yesterdaySteps : 0;

    // 解析轨迹 (Q2)
    const trackSeries = results[2]?.series?.[0];
    const coordinates = trackSeries ? trackSeries.values.map(v => [v[1], v[2]]).filter(c => c[0]) : [[31.2304, 121.4737]];

    const avgTemp = parseFloat(Number(todayMap.avg_temp || 38.5).toFixed(2));
    const battery = parseFloat(Number(todayMap.battery || 3.7).toFixed(2));

    res.json({
      date: todayISO.split('T')[0],
      petId,
      summary: todaySteps < 4000 ? "今日活动量偏低" : "今日表现不错",
      activity: {
        steps: todaySteps,
        completionRate: parseFloat((todaySteps / 10000).toFixed(2)),
        activeLevel: todaySteps > 8000 ? 'HIGH' : todaySteps > 4000 ? 'NORMAL' : 'LOW'
      },
      vitals: { avgTemp, status: (avgTemp > 39.2 || avgTemp < 37.5) ? 'WARNING' : 'NORMAL' },
      device: { battery, dataStatus: 'NORMAL', rsrp: -70, lastSeen: new Date(todayMap.time || Date.now()).toISOString() },
      coordinates,
      trend: { vsYesterday: parseFloat(vsYesterday.toFixed(2)), vs7DayAvg: 0.05, trendLabel: vsYesterday > 0 ? 'UP' : 'STABLE' },
      advice: ["多出门散散步"]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/analyze', async (req, res) => {
  try {
    const { report, provider = 'gemini' } = req.body;
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API_KEY not set");

    if (provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `宠物ID: ${report.petId}, 今日步数: ${report.activity.steps}, 体温: ${report.vitals.avgTemp}. 请以宠物的口吻写一段50字内的感言。` }] }],
        config: { systemInstruction: "你是一个贴心的宠物健康顾问。" }
      });
      return res.json({ text: response.text });
    }
    res.status(400).json({ error: "Unsupported provider" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on ${PORT}`);
});
