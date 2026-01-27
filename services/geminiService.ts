
import { DailyReport } from "../types";

export const generatePetSummary = async (report: DailyReport): Promise<string> => {
  try {
    // 关键修复：调用项目自带的 Vercel Serverless Function (/api/analyze.ts)
    // 这样 API_KEY 的读取发生在服务端，不会导致浏览器端 process 对象报错
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(report),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'AI 服务请求失败');
    }

    const data = await response.json();
    return data.text || "今天的健康体征非常平稳，一切正常！";
  } catch (error) {
    console.error("AI 分析服务异常:", error);
    // 降级处理逻辑
    const isHighActivity = report.activity.steps > 8000;
    return `[实时同步中] ${isHighActivity ? '今天是个运动小能手，表现超棒！' : '今天比较安静，我正在享受悠闲时光。'} 🐾`;
  }
};
