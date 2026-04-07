import React, { useRef, useEffect } from 'react';
import { VisualTheme, AudioData } from '../types';

interface KaleidoscopeProps {
  theme: VisualTheme; // We use theme for geometry (segments/speed) but not colors anymore
  audioData: AudioData;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  hue: number;
  size: number;
}

const Kaleidoscope: React.FC<KaleidoscopeProps> = ({ theme, audioData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  
  // Refs for data access inside the animation loop without re-triggering the effect
  const audioDataRef = useRef(audioData);
  const themeRef = useRef(theme);

  // Sync refs with props
  useEffect(() => {
    audioDataRef.current = audioData;
  }, [audioData]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let time = 0;
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const render = () => {
      if (!canvas) return;
      
      const { bass, mid, treble } = audioDataRef.current;
      const { segments, rotationSpeed, zoom } = themeRef.current;

      // Normalized Audio Inputs
      const nBass = Math.pow(bass / 255, 2); // Punchy bass
      const nMid = mid / 255;
      const nTreble = treble / 255;
      
      // Advance time based on rhythm
      time += (0.02 * rotationSpeed) + (nBass * 0.1);

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const maxRadius = Math.sqrt(w * w + h * h) * 0.7; 

      // 1. CLEAR / TRAILS
      // Increased opacity (0.25) to make background darker and improve contrast
      // Reset composite operation to source-over for the fade effect
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(0, 0, 0, ${0.25 - (nBass * 0.1)})`;
      ctx.fillRect(0, 0, w, h);

      // 2. VIEWPORT TRANSFORMS
      ctx.save();
      ctx.translate(cx, cy);

      // Shake
      if (nBass > 0.5) {
          const shakeAmt = (nBass - 0.5) * 40;
          ctx.translate((Math.random() - 0.5) * shakeAmt, (Math.random() - 0.5) * shakeAmt);
      }

      // Rotate
      ctx.rotate(time * 0.2);
      
      // Zoom Pulse
      const pulse = 1 + (nBass * 0.3);
      const baseZoom = zoom * (1 + Math.sin(time * 0.1) * 0.1);
      ctx.scale(baseZoom * pulse, baseZoom * pulse);

      // 3. AUDIO REACTIVE WARP TUNNEL
      // Use 'lighter' (additive blending) for neon glow
      ctx.globalCompositeOperation = 'lighter';
      
      const layers = 16;
      
      // Base Hue cycles over time, but jumps on Bass hits
      const baseHue = (time * 20) % 360;
      
      for (let l = 0; l < layers; l++) {
          ctx.save();
          
          // Counter-rotate layers
          const layerDir = l % 2 === 0 ? 1 : -1;
          const layerRotation = (time * 0.1 * layerDir) + ((l / layers) * Math.PI * 2);
          ctx.rotate(layerRotation);

          // Distance calc
          const layerOffset = (l + time * 0.5) % layers; 
          const normalizedDist = layerOffset / layers; // 0 (center) to 1 (edge)
          const r = Math.pow(normalizedDist, 1.8) * maxRadius; // Exponential spacing
          
          if (r < 10) { ctx.restore(); continue; }

          // DYNAMIC COLOR GENERATION
          // Hue: shifts per layer + bass impact
          const hue = (baseHue + (l * 10) + (nBass * 120)) % 360;
          // Saturation: High, modulated by Mid
          const sat = 80 + (nMid * 20);
          // Lightness: Boosted by Treble (High hats make it flash white)
          const light = 40 + (nTreble * 60); 
          
          const opacity = Math.sin(normalizedDist * Math.PI); // Fade edges

          ctx.beginPath();
          // Segments logic
          const sides = segments < 3 ? 3 : segments;
          
          for (let s = 0; s <= sides; s++) {
              const theta = (s / sides) * Math.PI * 2;
              
              // Distortion wave
              const distortion = Math.sin(theta * 3 + time * 4) * (nTreble * r * 0.3);
              const px = Math.cos(theta) * (r + distortion);
              const py = Math.sin(theta) * (r + distortion);
              
              if (s === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
          }
          ctx.closePath();

          // Fill is subtle
          ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${opacity * 0.1})`;
          ctx.fill();
          
          // Stroke is vibrant and thick
          const lineWidth = 3 + (nBass * 8 * (1 - normalizedDist));
          ctx.lineWidth = lineWidth;
          ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light}%, ${opacity})`;
          ctx.shadowBlur = lineWidth * 2;
          ctx.shadowColor = `hsla(${hue}, ${sat}%, 50%, 1)`; // Neon glow
          ctx.stroke();

          ctx.restore();
      }

      // 4. PARTICLE SYSTEM (SPARKLES)
      if (nTreble > 0.2) {
          const spawnCount = Math.floor(nTreble * 4);
          for(let i=0; i<spawnCount; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = (Math.random() * 8 + 5) + (nBass * 15);
              
              particlesRef.current.push({
                  x: 0, 
                  y: 0,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  life: 1.0,
                  hue: (baseHue + Math.random() * 60) % 360, // Analogous colors
                  size: Math.random() * 4 + 1
              });
          }
      }

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i];
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.02;

          if (p.life <= 0 || (p.x*p.x + p.y*p.y > maxRadius*maxRadius*2.5)) {
              particlesRef.current.splice(i, 1);
              continue;
          }

          ctx.beginPath();
          // Sparkles are very bright
          ctx.fillStyle = `hsla(${p.hue}, 100%, 80%, ${p.life})`;
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
      }

      // 5. FLASH ON KICK
      if (nBass > 0.8) {
         ctx.fillStyle = `rgba(255, 255, 255, ${(nBass - 0.8) * 0.15})`;
         ctx.globalCompositeOperation = 'overlay';
         ctx.fillRect(-cx, -cy, w * 2, h * 2);
      }

      ctx.restore();
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ filter: 'contrast(1.2)' }}
    />
  );
};

export default Kaleidoscope;
