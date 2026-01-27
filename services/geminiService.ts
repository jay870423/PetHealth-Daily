
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { DailyReport } from "../types";

export const generatePetSummary = async (report: DailyReport): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("API_KEY 缺失，请检查环境变量配置。");
      return "AI 分析服务暂不可用。";
    }

    // 遵循规范：使用 process.env.API_KEY 初始化
    const ai = new GoogleGenAI({ apiKey });
    
    const isDog = report.speciesId === 1;
    const isCat = report.speciesId === 2;
    const speciesName = isDog ? "小狗" : isCat ? "小猫" : "宠物";
    const soundEffect = isDog ? "汪汪！" : isCat ? "喵呜~" : "🐾";

    const systemInstruction = `你是一位精通宠物行为学的健康专家。请以一只${speciesName}的口吻分析当天的健康数据。
    数据摘要：步数 ${report.activity.steps}，目标完成度 ${Math.round(report.activity.completionRate * 100)}%，平均体温 ${report.vitals.avgTemp}°C。
    要求：语气生动活泼，内容温暖感人，字数在100字以内。
    结尾必须带上相应的叫声：${soundEffect}`;

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "请根据我的健康指标给我写一段简短的健康日报摘要。",
      config: {
        systemInstruction,
        temperature: 0.8,
      }
    });

    // 遵循规范：直接访问 .text 属性
    const text = response.text;
    return text || "今天的运动和体征都很平稳，主人不用担心我哦！";
  } catch (error) {
    console.error("Gemini AI 分析失败:", error);
    return "哎呀，连接 AI 卫星失败了... 但看数据我今天表现得挺不错！🐾";
  }
};
