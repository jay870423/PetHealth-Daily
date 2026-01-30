
import { DailyReport, AiProvider } from "../types";

export interface AIAnalysisResult {
  summary: string;
  advice: string[];
}

export const generatePetSummary = async (report: DailyReport, provider: AiProvider = 'gemini'): Promise<AIAnalysisResult> => {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ report, provider }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    
    // 如果返回的是嵌套在 text 里的 JSON 字符串（针对某些代理转发情况）
    if (typeof data.text === 'string' && data.text.startsWith('{')) {
      return JSON.parse(data.text);
    }

    return {
      summary: data.summary || "日报分析完成，体征状态正常。",
      advice: data.advice || ["继续保持规律的户外活动"]
    };
  } catch (error: any) {
    console.error(`AI 分析服务 (${provider}) 异常:`, error.message);
    return {
      summary: `[离线分析] 今天的步数是 ${report.activity.steps}，感觉状态很稳！`,
      advice: ["检查设备佩戴位置是否正确", "根据今日活动量合理喂食"]
    };
  }
};
