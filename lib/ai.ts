import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function parseModelJson(text: string | undefined): unknown {
  const raw = (text ?? "").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.match(/\{[\s\S]*\}/);
    if (!fenced) return {};
    try {
      return JSON.parse(fenced[0]);
    } catch {
      return {};
    }
  }
}

export async function triageRequestWithGemini(
  mediaBuffer: Buffer,
  mimeType: string,
  residentName: string,
  residentPhone: string,
) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        inlineData: {
          data: mediaBuffer.toString("base64"),
          mimeType: mimeType || "audio/webm",
        },
      },
      `Analyze this post-typhoon distress audio or image input from resident "${residentName}", contact phone ${residentPhone}. Classify the urgency, category, summary, and dispatch action needed. The summary must be one sentence that includes the resident name "${residentName}" and phone ${residentPhone}.`,
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          urgency_level: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] },
          category: { type: Type.STRING, enum: ["MEDICAL", "NON_MEDICAL", "MOBILITY", "OTHER"] },
          summary: {
            type: Type.STRING,
            description:
              "One sentence that includes the resident name, phone number, and the specific emergency issue",
          },
          dispatch_action: {
            type: Type.STRING,
            enum: ["EMERGENCY_medical", "EMERGENCY_nonmedical", "NEIGHBORHOOD_VOLUNTEER"],
          },
        },
        required: ["urgency_level", "category", "summary", "dispatch_action"],
      },
    },
  });
  return parseModelJson(response.text);
}
