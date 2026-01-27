
import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  try {
    const report = await req.json();
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API_KEY 缺失，请在 Vercel 后台设置环境变量。" }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const isDog = report.speciesId === 1;
    const isCat = report.speciesId === 2;
    const speciesName = isDog ? "小狗" : isCat ? "小猫" : "宠物";
    const soundEffect = isDog ? "汪汪！" : isCat ? "喵呜~" : "🐾";
    const characterTrait = isDog ? "忠诚且充满活力" : isCat ? "优雅而略显慵懒" : "可爱";

    const systemInstruction = `你是一位精通宠物行为学的健康专家。
    请以一只【${characterTrait}】的【${speciesName}】的口吻，根据当日健康数据生成一段简短的健康日报摘要。
    
    要求：
    1. 使用第一人称，性格鲜明。
    2. 如果步数达标，表现得很自豪；如果体温异常，表现得有点委屈或提醒主人关注。
    3. 如果电量低于3.6V，顺便提醒主人“我快没能量了”。
    4. 结尾必须使用：${soundEffect}。
    5. 字数控制在100字以内，仅输出正文。`;

    const prompt = `
    我的今日数据：
    - 步数：${report.activity.steps}
    - 目标达成率：${(report.activity.completionRate * 100).toFixed(1)}%
    - 状态：${report.activity.activeLevel} 活跃度
    - 平均体温：${report.vitals.avgTemp}°C
    - 设备电压：${report.device.battery}V
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.8,
      }
    });

    const text = response.text || "数据同步完成，今天也是元气满满的一天！";
    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
