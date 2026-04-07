export enum VisualizerMode {
  Microphone = 'MICROPHONE',
  Music = 'MUSIC', // Generative Keygen Music
  Simulation = 'SIMULATION'
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

export interface VisualTheme {
  name: string;
  description: string;
  colors: string[]; // Array of hex codes for the gradient
  gradientType: 'conic' | 'radial' | 'linear';
  segments: number; // Number of kaleidoscope slices (6, 8, 12, etc.)
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'difference' | 'exclusion' | 'color-dodge';
  rotationSpeed: number; // Base speed factor
  zoom: number; // Base zoom level
}

export interface AudioData {
  bass: number;    // 0-255
  mid: number;     // 0-255
  treble: number;  // 0-255
  volume: number;  // 0-255 average
}