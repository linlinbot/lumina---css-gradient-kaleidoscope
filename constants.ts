import { VisualTheme } from './types';

export const DEFAULT_THEME: VisualTheme = {
  name: "Neon Cyber",
  description: "A default high-contrast cyberpunk palette",
  colors: ["#FF00CC", "#3333FF", "#00CCFF", "#FFCC00"],
  gradientType: "conic",
  segments: 12,
  blendMode: "screen",
  rotationSpeed: 1,
  zoom: 1.5,
};

export const SAMPLE_PROMPTS = [
  "Deep ocean bioluminescence",
  "Sunset on Mars",
  "90s Acid Techno",
  "Pastel Cotton Candy Dream",
  "Volcanic Eruption",
  "Matrix Digital Rain"
];