
import { GoogleGenAI } from "@google/genai";

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

  // 处理预检请求
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
    const characterTrait = isDog ? "忠诚且充满活力" : "优雅而略显慵懒";

    const systemPrompt = `你是一位精通宠物行为学的健康专家。
请以一只【${characterTrait}】的【${speciesName}】的口吻，根据当日健康数据生成一段简短的健康日报摘要。
要求：
1. 使用第一人称，性格鲜明。
2. 步数达标要自豪，体温异常要委屈提醒。
3. 如果电量低于3.65V，提醒“能量快空了”。
4. 结尾必须使用：${soundEffect}。
5. 字数控制在80字以内，仅输出正文内容，不要包含任何前导词。`;

    const userPrompt = `今日健康数据：步数 ${report.activity.steps}，目标达成率 ${(report.activity.completionRate * 100).toFixed(1)}%，平均体温 ${report.vitals.avgTemp}°C，设备电压 ${report.device.battery}V。`;

    // --- Provider: Gemini ---
    if (provider === 'gemini') {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "Gemini API_KEY 未在环境变量中配置" }), { status: 500, headers: corsHeaders });
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: userPrompt }] }],
        config: { 
          systemInstruction: systemPrompt, 
          temperature: 0.8,
          topP: 0.95,
          topK: 40
        }
      });

      const text = response.text || "体征数据已同步，我今天感觉棒极了！";
      return new Response(JSON.stringify({ text }), { status: 200, headers: corsHeaders });
    }

    // --- Provider: DeepSeek ---
    if (provider === 'deepseek') {
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) throw new Error("DEEPSEEK_API_KEY 未配置");
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${apiKey}` 
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          max_tokens: 150
        })
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "DeepSeek 正在思考中...";
      return new Response(JSON.stringify({ text }), { status: 200, headers: corsHeaders });
    }

    // --- Provider: Qwen (DashScope) ---
    if (provider === 'qwen') {
      const apiKey = process.env.QWEN_API_KEY;
      if (!apiKey) throw new Error("QWEN_API_KEY 未配置");
      const res = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${apiKey}` 
        },
        body: JSON.stringify({
          model: "qwen-plus",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        })
      });
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content || "通义千问正在同步我的心情...";
      return new Response(JSON.stringify({ text }), { status: 200, headers: corsHeaders });
    }

    throw new Error("无效的模型提供商选择");

  } catch (error: any) {
    console.error("AI Analysis Edge Error:", error);
    return new Response(JSON.stringify({ 
      error: "AI 服务暂时不可用", 
      details: error.message 
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
