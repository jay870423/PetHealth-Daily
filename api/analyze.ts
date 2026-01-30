
import { GoogleGenAI, Type } from "@google/genai";

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { report, provider = 'gemini' } = await req.json();
    
    if (!report) {
      return new Response(JSON.stringify({ error: "Missing report data" }), { status: 400, headers: corsHeaders });
    }

    const isDog = report.speciesId === 1;
    const speciesName = isDog ? "小狗" : "小猫";
    const soundEffect = isDog ? "汪汪！" : "喵呜~";
    const characterTrait = isDog ? "活泼且忠诚" : "优雅而内敛";

    const systemInstruction = `你是一位精通宠物行为学和临床兽医学的资深专家。
请根据提供的宠物健康监测数据，生成以下内容：
1. [summary]: 以一只【${characterTrait}】的【${speciesName}】的口吻，描述自己今天的感受（第一人称）。
2. [advice]: 给出2-3条非常具体、具备专业性的针对性建议（例如：调整喂食量、特定类型的互动、环境温度建议等）。

数据背景：
- 步数：${report.activity.steps}步（目标10000）
- 体温：${report.vitals.avgTemp}°C
- 趋势：较昨日${report.trend.vsYesterday > 0 ? '上升' : '下降'}${Math.abs(report.trend.vsYesterday * 100)}%

约束：
- summary 控制在60字内，带语气词，结尾是：${soundEffect}。
- advice 每条20字左右，强调科学性。
- 必须且仅输出一个合法的 JSON 对象，格式为: {"summary": "string", "advice": ["string", "string"]}。`;

    // --- 1. Gemini Implementation ---
    if (provider === 'gemini') {
      const apiKey = process.env.API_KEY;
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: "生成分析报告" }] }],
        config: { 
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              advice: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["summary", "advice"]
          }
        }
      });
      return new Response(response.text, { status: 200, headers: corsHeaders });
    }

    // --- 2. DeepSeek / Qwen Implementation (OpenAI Compatible) ---
    let apiUrl = "";
    let apiKey = "";
    let modelName = "";

    if (provider === 'deepseek') {
      apiUrl = "https://api.deepseek.com/chat/completions";
      apiKey = process.env.DEEPSEEK_API_KEY || "";
      modelName = "deepseek-chat";
    } else if (provider === 'qwen') {
      apiUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
      apiKey = process.env.QWEN_API_KEY || "";
      modelName = "qwen-plus";
    }

    if (!apiKey) {
      throw new Error(`API Key for ${provider} is not configured`);
    }

    const aiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: "请根据最新的日报数据输出 JSON 结果。" }
        ],
        response_format: { type: "json_object" }
      })
    });

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    // 尝试解析，防止模型输出包含 Markdown 代码块
    let result = content;
    if (content.includes("```json")) {
      result = content.split("```json")[1].split("```")[0].trim();
    } else if (content.includes("```")) {
      result = content.split("```")[1].split("```")[0].trim();
    }

    return new Response(result, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return new Response(JSON.stringify({ 
      summary: "AI 暂时断开连接，我正在梳理毛发...", 
      advice: ["检查网络连接", "请稍后重试模型分析"] 
    }), { status: 500, headers: corsHeaders });
  }
}
