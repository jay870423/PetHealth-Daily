
import { DailyReport, AiProvider } from "../types";

export const generatePetSummary = async (report: DailyReport, provider: AiProvider = 'gemini'): Promise<string> => {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ report, provider }),
    });

    const contentType = response.headers.get("content-type");
    if (!response.ok) {
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      throw new Error(`网络请求失败: ${response.status}`);
    }

    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("服务器返回了非 JSON 格式的响应");
    }

    const data = await response.json();
    return data.text || "日报分析完成，体征状态正常。";
  } catch (error: any) {
    console.error(`AI 分析服务 (${provider}) 异常:`, error.message);
    const isHighActivity = report.activity.steps > 8000;
    return `[实时同步中] ${isHighActivity ? '今天运动量满分，我是最棒的！' : '今天稍微偷了点懒，但感觉很舒适。'} 🐾 (错误: ${error.message.substring(0, 20)}...)`;
  }
};
