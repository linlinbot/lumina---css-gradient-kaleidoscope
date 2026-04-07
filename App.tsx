import React, { useState, useEffect } from 'react';
import Kaleidoscope from './components/Kaleidoscope';
import Controls from './components/Controls';
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer';
import { generateThemeFromPrompt } from './services/geminiService';
import { DEFAULT_THEME } from './constants';
import { VisualTheme, VisualizerMode } from './types';

function App() {
  // Default to Music mode so user hears the synth immediately upon interaction
  const [mode, setMode] = useState<VisualizerMode>(VisualizerMode.Music);
  const [isRunning, setIsRunning] = useState(false); // Start paused so music doesn't blast
  const [theme, setTheme] = useState<VisualTheme>(DEFAULT_THEME);
  const [isGenerating, setIsGenerating] = useState(false);

  // Audio Hook
  const { audioData, initAudio } = useAudioAnalyzer(mode, isRunning);

  // Handle Mode Switching
  useEffect(() => {
    // If switching to active audio modes, re-init
    if ((mode === VisualizerMode.Microphone || mode === VisualizerMode.Music) && isRunning) {
      initAudio();
    }
  }, [mode, isRunning, initAudio]);

  const handleGenerateTheme = async (prompt: string) => {
    if (!prompt) return;
    setIsGenerating(true);
    try {
      const newTheme = await generateThemeFromPrompt(prompt);
      setTheme(newTheme);
    } catch (e) {
      console.error("Failed to generate theme", e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white selection:bg-indigo-500 selection:text-white">
      
      {/* Background Layer - Deep Ambient Glow matching theme */}
      <div 
        className="absolute inset-0 opacity-30 transition-colors duration-1000"
        style={{
            background: `radial-gradient(circle at center, ${theme.colors[0]}, #000000 90%)`
        }}
      />

      {/* Visualizer Layer - Canvas based */}
      <div className="absolute inset-0 z-0">
         <Kaleidoscope theme={theme} audioData={audioData} />
      </div>

      {/* Vignette Overlay for focus */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(transparent_40%,black_100%)]" />

      {/* Start Overlay (if not running) */}
      {!isRunning && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <button 
                onClick={() => setIsRunning(true)}
                className="group relative px-8 py-4 bg-white text-black font-bold text-xl rounded-full hover:scale-105 transition-transform"
            >
                <span className="relative z-10">Start Visualizer</span>
                <div className="absolute inset-0 rounded-full bg-white blur-lg opacity-50 group-hover:opacity-80 transition-opacity" />
            </button>
        </div>
      )}

      {/* Controls UI */}
      <Controls 
        isRunning={isRunning}
        setIsRunning={setIsRunning}
        mode={mode}
        setMode={setMode}
        currentTheme={theme}
        isGenerating={isGenerating}
        onGenerate={handleGenerateTheme}
      />
      
      {/* Attribution / API Warning */}
      {!process.env.API_KEY && (
         <div className="absolute top-4 left-4 z-50 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-sm shadow-lg max-w-sm">
            Warning: API_KEY is missing. AI generation will not work.
         </div>
      )}
    </div>
  );
}

export default App;