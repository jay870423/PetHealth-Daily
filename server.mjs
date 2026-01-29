
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

// 1. 托管静态资源 (Vite 打包后的目录)
app.use(express.static(path.join(__dirname, 'dist')));

// 2. 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({
    status: "ok",
    gateway: "active",
    runtime: "nodejs-express",
    timestamp: new Date().toISOString(),
    env_configured: !!process.env.INFLUX_URL
  });
});

// 3. 遥测数据接口 (Telemetery)
app.get('/api/telemetry', async (req, res) => {
  try {
    const petId = req.query.petId || "221";
    const rawInfluxUrl = process.env.INFLUX_URL || "";
    const influxUrl = rawInfluxUrl.trim().replace(/\/+$/, "");
    const influxDb = (process.env.INFLUX_BUCKET || "pet_health").trim();
    const influxToken = (process.env.INFLUX_TOKEN || "").trim();

    if (!influxUrl) {
      return res.status(500).json({ error: "Configuration Error", message: "INFLUX_URL not set" });
    }

    const query = `SELECT * FROM pet_activity WHERE tracker_id = '${petId}' ORDER BY time DESC LIMIT 30`;
    const endpoint = `${influxUrl}/query?db=${encodeURIComponent(influxDb)}&q=${encodeURIComponent(query)}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(influxToken ? { 'Authorization': `Token ${influxToken}` } : {}),
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: "InfluxDB Request Failed" });
    }

    const data = await response.json();
    const series = data.results?.[0]?.series?.[0];

    if (!series || !series.values || series.values.length === 0) {
      return res.json({ _empty: true, message: `ID为 ${petId} 的设备无数据` });
    }

    const columns = series.columns;
    const latestRow = series.values[0];
    const getVal = (row, name) => {
      const idx = columns.indexOf(name);
      return idx !== -1 ? row[idx] : null;
    };

    const coordinates = series.values
      .map(v => [parseFloat(getVal(v, 'lat') || 0), parseFloat(getVal(v, 'lng') || 0)])
      .filter(c => c[0] !== 0);

    const steps = Math.round(Number(getVal(latestRow, 'step') || 0));
    const avgTemp = parseFloat(Number(getVal(latestRow, 'temp') || 38.5).toFixed(2));
    const battery = parseFloat(Number(getVal(latestRow, 'batvol') || 3.7).toFixed(2));

    res.json({
      date: new Date().toISOString().split('T')[0],
      petId,
      speciesId: parseInt(getVal(latestRow, 'species_id') || "1"),
      activity: {
        steps,
        completionRate: parseFloat((steps / 10000).toFixed(2)),
        activeLevel: steps > 8000 ? 'HIGH' : steps > 4000 ? 'NORMAL' : 'LOW',
        stride: 0.45
      },
      vitals: { avgTemp, status: (avgTemp > 39.2 || avgTemp < 37.5) ? 'WARNING' : 'NORMAL' },
      device: { battery, dataStatus: 'NORMAL', rsrp: -70, lastSeen: getVal(latestRow, 'time') },
      coordinates: coordinates.length > 0 ? coordinates : [[31.2304, 121.4737]],
      trend: { vsYesterday: 0, vs7DayAvg: 0, trendLabel: 'STABLE' }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. AI 分析接口 (Analyze)
app.post('/api/analyze', async (req, res) => {
  try {
    const { report, provider = 'gemini' } = req.body;
    const isDog = report.speciesId === 1;
    const soundEffect = isDog ? "汪汪！" : "喵呜~";
    
    const systemPrompt = `你是一位精通宠物行为学的专家。请以宠物的口吻生成日报，结尾必须包含：${soundEffect}`;
    const userPrompt = `今日步数：${report.activity.steps}，体温：${report.vitals.avgTemp}`;

    if (provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: userPrompt }] }],
        config: { systemInstruction: systemPrompt }
      });
      return res.json({ text: response.text });
    }
    
    // 其他模型逻辑略，保持与 analyze.ts 一致
    res.status(400).json({ error: "Only Gemini is implemented in this snippet" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. 处理前端路由回退 (SPA 关键)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
