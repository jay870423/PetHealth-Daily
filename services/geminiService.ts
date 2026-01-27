
import { DailyReport } from "../types";

export const generatePetSummary = async (report: DailyReport) => {
  try {
    // 调用本地 Vercel API 路由以解决国内访问限制并保护 API Key
    // Vercel 节点会自动中转请求至 Google
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(report),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'AI 节点响应异常');
    }

    const data = await response.json();
    return data.text || "数据已同步，我的身体状态看起来棒极了！汪汪！";
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return "哎呀，思维电路在穿越云端时迷路了... 但从数据看，我今天表现得很努力哦！🐾 (提示：请检查 Vercel 环境变量 API_KEY 是否配置)";
  }
};
