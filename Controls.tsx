import React, { useState } from 'react';
import { Play, Pause, Mic, Wand2, Music2, Sliders, Radio } from 'lucide-react';
import { VisualTheme, VisualizerMode } from '../types';
import { SAMPLE_PROMPTS } from '../constants';

interface ControlsProps {
  isRunning: boolean;
  setIsRunning: (val: boolean) => void;
  mode: VisualizerMode;
  setMode: (val: VisualizerMode) => void;
  currentTheme: VisualTheme;
  isGenerating: boolean;
  onGenerate: (prompt: string) => void;
}

const Controls: React.FC<ControlsProps> = ({
  isRunning,
  setIsRunning,
  mode,
  setMode,
  currentTheme,
  isGenerating,
  onGenerate,
}) => {
  const [prompt, setPrompt] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onGenerate(prompt);
      setPrompt("");
    }
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 p-6 flex flex-col items-center justify-end z-50 pointer-events-none transition-all duration-300 ${isExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-80px)]'}`}>
      
      {/* Toggle Expansion Area */}
      <div className="w-full max-w-2xl pointer-events-auto">
        
        {/* Main Glass Panel */}
        <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden relative group">
          
           {/* Collapse Toggle (Mobile mostly, or clean view) */}
           <button 
             onClick={() => setIsExpanded(!isExpanded)}
             className="absolute top-2 right-2 text-white/30 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
           >
             <Sliders size={16} />
           </button>

          {/* Header Status */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                {currentTheme.name}
              </h1>
              <p className="text-xs text-white/50 font-light tracking-wider mt-1 line-clamp-1">
                {currentTheme.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-xs font-mono text-white/50 uppercase">
                    {mode === VisualizerMode.Microphone ? 'Mic Active' : mode === VisualizerMode.Music ? 'Playing Music' : 'Simulating'}
                </span>
            </div>
          </div>

          {/* Main Controls Row */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-white text-black hover:bg-gray-200 transition-colors shadow-lg active:scale-95"
              title={isRunning ? "Pause" : "Play"}
            >
              {isRunning ? <Pause fill="currentColor" /> : <Play fill="currentColor" className="ml-1" />}
            </button>

            <div className="h-8 w-[1px] bg-white/10 mx-2" />

            <div className="flex bg-white/5 rounded-full p-1 border border-white/5">
                <button
                    onClick={() => setMode(VisualizerMode.Music)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        mode === VisualizerMode.Music 
                        ? 'bg-purple-600 text-white shadow-lg' 
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Music2 size={16} />
                    <span>Music</span>
                </button>
                <button
                    onClick={() => setMode(VisualizerMode.Microphone)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        mode === VisualizerMode.Microphone 
                        ? 'bg-indigo-600 text-white shadow-lg' 
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Mic size={16} />
                    <span>Mic</span>
                </button>
                <button
                    onClick={() => setMode(VisualizerMode.Simulation)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        mode === VisualizerMode.Simulation 
                        ? 'bg-gray-600 text-white shadow-lg' 
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <Radio size={16} />
                    <span>Sim</span>
                </button>
            </div>
          </div>

          {/* AI Generator Section */}
          <div className="space-y-3">
             <label className="text-xs text-indigo-300 font-bold uppercase tracking-widest flex items-center gap-2">
                <Wand2 size={12} />
                Generate Visuals
             </label>
             <form onSubmit={handleSubmit} className="relative">
                <input 
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe a mood (e.g., 'Interstellar Black Hole')"
                    disabled={isGenerating}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
                <button 
                    type="submit"
                    disabled={isGenerating || !prompt.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isGenerating ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Wand2 size={16} />
                    )}
                </button>
             </form>
             
             {/* Quick Prompts */}
             <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide mask-fade-right">
                {SAMPLE_PROMPTS.map((p, i) => (
                    <button
                        key={i}
                        onClick={() => onGenerate(p)}
                        className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-white/70 hover:text-white transition-colors"
                    >
                        {p}
                    </button>
                ))}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Controls;