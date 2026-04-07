import { GoogleGenAI, Type } from "@google/genai";
import { VisualTheme } from "../types";

// Helper to validate colors
const isValidHex = (color: string) => /^#([0-9A-F]{3}){1,2}$/i.test(color);

export const generateThemeFromPrompt = async (prompt: string): Promise<VisualTheme> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key not found");
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a creative kaleidoscope visualizer theme based on this mood/description: "${prompt}".
      
      Requirements:
      - Colors should be high contrast and vibrant suitable for a dark background.
      - Segments should be an even integer between 6 and 24.
      - Gradient type must be one of: 'conic', 'radial', 'linear'.
      - Blend mode must be standard CSS mix-blend-mode values.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            colors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of 3-5 HEX color codes",
            },
            gradientType: { type: Type.STRING, enum: ["conic", "radial", "linear"] },
            segments: { type: Type.INTEGER },
            blendMode: { type: Type.STRING, enum: ["normal", "multiply", "screen", "overlay", "difference", "exclusion", "color-dodge"] },
            rotationSpeed: { type: Type.NUMBER, description: "Float between 0.1 and 3.0" },
            zoom: { type: Type.NUMBER, description: "Float between 1.0 and 2.5" }
          },
          required: ["name", "description", "colors", "gradientType", "segments", "blendMode", "rotationSpeed", "zoom"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text) as VisualTheme;

    // Sanitize colors
    const sanitizedColors = data.colors.map(c => isValidHex(c) ? c : "#FFFFFF");
    
    return {
      ...data,
      colors: sanitizedColors.length > 1 ? sanitizedColors : ["#FF0000", "#0000FF"],
      // Ensure segments is even for better symmetry
      segments: data.segments % 2 !== 0 ? data.segments + 1 : data.segments
    };

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    // Return a fallback random theme on error to keep app running
    return {
      name: "Error Fallback",
      description: "Could not generate theme, showing default.",
      colors: ["#FF0000", "#FFFF00", "#00FFFF"],
      gradientType: "radial",
      segments: 8,
      blendMode: "screen",
      rotationSpeed: 0.5,
      zoom: 1.0
    };
  }
};
