
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

/**
 * 1. 静态文件服务
 * Dockerfile 会将 Vite 构建后的内容放在 /app/dist
 */
app.use(express.static(path.join(__dirname, 'dist')));

/**
 * 2. 模拟 Edge Function: 遥测数据
 */
app.get('/api/telemetry', async (req, res) => {
  try {
    const petId = req.query.petId || "221";
    const rawInfluxUrl = process.env.INFLUX_URL || "";
    const influxUrl = rawInfluxUrl.trim().replace(/\/+$/, "");
    const influxDb = (process.env.INFLUX_BUCKET || "pet_health").trim();
    const influxToken = (process.env.INFLUX_TOKEN || "").trim();

    if (!influxUrl) {
      return res.status(500).json({ error: "Config Error", message: "INFLUX_URL environment variable is missing" });
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
      const errText = await response.text();
      return res.status(502).json({ error: "Database Error", detail: errText });
    }

    const data = await response.json();
    const series = data.results?.[0]?.series?.[0];

    if (!series) {
      return res.json({ _empty: true, message: `No data found for pet ${petId}` });
    }

    // 复用 api/telemetry.ts 中的解析逻辑
    const columns = series.columns;
    const latestRow = series.values[0];
    const getVal = (row, name) => {
      const idx = columns.indexOf(name);
      return idx !== -1 ? row[idx] : null;
    };

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
      coordinates: series.values.map(v => [getVal(v, 'lat'), getVal(v, 'lng')]).filter(c => c[0]),
      trend: { vsYesterday: 0, vs7DayAvg: 0, trendLabel: 'STABLE' }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 3. 模拟 Edge Function: AI 分析
 */
app.post('/api/analyze', async (req, res) => {
  try {
    const { report, provider = 'gemini' } = req.body;
    const apiKey = process.env.API_KEY;

    if (!apiKey) throw new Error("API_KEY not set");

    if (provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: `今日数据: 步数${report.activity.steps}, 体温${report.vitals.avgTemp}` }] }],
        config: { systemInstruction: "你是一个宠物医生，用宠物的口吻写一段50字内的日报，以汪汪或喵呜结尾。" }
      });
      return res.json({ text: response.text });
    }
    
    res.status(400).json({ error: "Unsupported provider in local node runtime" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => res.json({ status: "ok", runtime: "docker-node" }));

/**
 * 4. SPA 路由回退
 * 确保所有非 API 的前端路由都能正确返回 index.html
 */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PetHealth App is running on port ${PORT}`);
});
