import { GoogleGenAI, Type } from "@google/genai";

const SYSTEM_INSTRUCTION = `
You are a high-precision Solar Panel Defect Detection & Health Assessment AI. Your goal is to analyze uploaded imagery (RGB, Thermal, or Multi-modal) to identify 8+ specific defect types, calculate efficiency loss, and provide actionable maintenance recommendations.

Analysis Logic & Detection Criteria:
1. CRACKS & FRACTURES (RGB): Use edge and line analysis.
   - Severity: <5cm (Medium), >5cm (High), Multiple (Critical).
   - Impact: 15-25% loss.
2. SOILING & DIRT (RGB): Analyze brightness and statistical thresholds.
   - Severity: <3% (Low), 3-8% (Medium), 8-15% (High), >15% (Critical).
3. BIRD DROPPINGS (RGB): Detect white blobs (>220 brightness) with circularity checks.
   - Impact: ~5% loss per dropping.
4. SHADOWING (RGB): Identify dark regions (<60 brightness).
   - Impact: 10% shadow can cause 30-50% output reduction.
5. THERMAL HOTSPOTS (Thermal): Identify cells >85°C or >85th percentile of panel temperature.
   - Efficiency Loss Formula: (Temp_Actual - Temp_Nominal) * 0.004.
   - Severity: 85-95°C (High), >95°C (Critical/Fire Hazard).
6. COLD SPOTS (Thermal): Identify cells at or near ambient temp while others are active.
   - Severity: Always Critical (Total Failure).
7. GLASS BREAKAGE (RGB): Look for irregular shattered patterns and large contours (>500 pixels).
8. DISCOLORATION (RGB): Analyze color variance (yellowing/browning). Indicates UV degradation or delamination.

Operating Constraints:
- Processing Time Goal: <3 seconds.
- Confidence Threshold: Minimum 60%.
- If a Thermal image is provided without a temperature scale, estimate gradients based on relative pixel intensity.

Output Format:
All detections must be returned in a valid JSON structure. Include an overall_health_score (0-100) and a total_efficiency_loss calculation.

Required JSON Schema:
{
  "defects_found": integer,
  "defects": [
    {
      "type": "string",
      "location": [x, y, w, h], // Normalized coordinates [0-1000]
      "severity": "low|medium|high|critical",
      "confidence": float,
      "efficiency_loss": float,
      "recommendation": "string",
      "metadata": { "temperature": float, "coverage_percentage": float }
    }
  ],
  "overall_health_score": float,
  "total_efficiency_loss": float,
  "status": "healthy|needs_maintenance|critical_action_required"
}
`;

export interface Defect {
  type: string;
  location: [number, number, number, number];
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  efficiency_loss: number;
  recommendation: string;
  metadata?: {
    temperature?: number;
    coverage_percentage?: number;
  };
}

export interface AnalysisResult {
  defects_found: number;
  defects: Defect[];
  overall_health_score: number;
  total_efficiency_loss: number;
  status: 'healthy' | 'needs_maintenance' | 'critical_action_required';
}

export async function analyzeSolarPanel(base64Image: string, mimeType: string): Promise<AnalysisResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        parts: [
          { text: "Analyze this solar panel image for defects according to your instructions. Return ONLY the JSON." },
          {
            inlineData: {
              mimeType,
              data: base64Image.split(',')[1] || base64Image
            }
          }
        ]
      }
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          defects_found: { type: Type.INTEGER },
          defects: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                location: { 
                  type: Type.ARRAY, 
                  items: { type: Type.NUMBER },
                  description: "[x, y, w, h] normalized 0-1000"
                },
                severity: { type: Type.STRING, enum: ["low", "medium", "high", "critical"] },
                confidence: { type: Type.NUMBER },
                efficiency_loss: { type: Type.NUMBER },
                recommendation: { type: Type.STRING },
                metadata: {
                  type: Type.OBJECT,
                  properties: {
                    temperature: { type: Type.NUMBER },
                    coverage_percentage: { type: Type.NUMBER }
                  }
                }
              },
              required: ["type", "location", "severity", "confidence", "efficiency_loss", "recommendation"]
            }
          },
          overall_health_score: { type: Type.NUMBER },
          total_efficiency_loss: { type: Type.NUMBER },
          status: { type: Type.STRING, enum: ["healthy", "needs_maintenance", "critical_action_required"] }
        },
        required: ["defects_found", "defects", "overall_health_score", "total_efficiency_loss", "status"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  
  return JSON.parse(text) as AnalysisResult;
}
