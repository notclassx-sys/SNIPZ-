
import { GoogleGenAI } from "@google/genai";

// Always use direct process.env.API_KEY for initialization as per guidelines.
export const getSmartTaskDescription = async (taskName: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Suggest a professional and detailed description for a team task named: "${taskName}". Keep it concise (max 3 sentences).`,
    });
    // Use .text property directly as per @google/genai rules.
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "";
  }
};

export const getTeamActivitySummary = async (logs: any[]): Promise<string> => {
  if (logs.length === 0) return "Not enough activity to summarize.";
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const logSummary = logs.slice(0, 10).map(l => `${l.fromUserName} ${l.action.toLowerCase()} task "${l.taskName}" to ${l.toUserName}`).join("; ");
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Given these team activity logs: [${logSummary}]. Provide a one-sentence high-level summary of team productivity or bottleneck for the manager.`,
    });
    // Use .text property directly.
    return response.text?.trim() || "Team is active and processing tasks.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Activity summarized automatically based on logs.";
  }
};
