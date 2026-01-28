
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

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'AI 服务请求失败');
    }

    const data = await response.json();
    return data.text || "数据同步完成，宠物状态良好。";
  } catch (error) {
    console.error(`AI 分析服务 (${provider}) 异常:`, error);
    const isHighActivity = report.activity.steps > 8000;
    return `[实时同步中] ${isHighActivity ? '今天是个运动小能手！' : '今天比较安静，我正在享受悠闲时光。'} 🐾`;
  }
};
