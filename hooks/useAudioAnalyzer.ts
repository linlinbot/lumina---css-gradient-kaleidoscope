import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioData, VisualizerMode } from '../types';

export const useAudioAnalyzer = (mode: VisualizerMode, isRunning: boolean) => {
  const [audioData, setAudioData] = useState<AudioData>({ bass: 0, mid: 0, treble: 0, volume: 0 });
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | AudioNode | null>(null);
  const rafIdRef = useRef<number | null>(null);
  
  // Music Scheduler State
  const nextNoteTimeRef = useRef<number>(0);
  const schedulerTimerRef = useRef<number | null>(null);
  const sequenceStepRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    if (schedulerTimerRef.current) {
      window.clearTimeout(schedulerTimerRef.current);
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  // --- SYNTHESIZER ENGINE ---
  // Generates Old School Keygen / Tracker Music
  const scheduleMusic = useCallback((ctx: AudioContext, analyser: AnalyserNode) => {
    const tempo = 135; 
    const secondsPerBeat = 60.0 / tempo;
    const lookahead = 25.0; 
    const scheduleAheadTime = 0.1; 

    // Helper: MIDI Note to Frequency
    // A4 = 69 = 440Hz
    const mtof = (note: number) => 440 * Math.pow(2, (note - 69) / 12);

    // CHORD PROGRESSION (12 Bars)
    // Root notes in MIDI (A2 = 45, A3 = 57)
    // Type: 0 = Minor (0,3,7), 1 = Major (0,4,7)
    const progression = [
        { root: 57, type: 0 }, // Bar 0: Am
        { root: 55, type: 1 }, // Bar 1: G  (Major) -> Fixes the out-of-tune issue
        { root: 53, type: 1 }, // Bar 2: F  (Major)
        { root: 52, type: 1 }, // Bar 3: E  (Major - Andalusian cadence usually uses E major)
        { root: 57, type: 0 }, // Bar 4: Am
        { root: 60, type: 1 }, // Bar 5: C  (Major)
        { root: 53, type: 1 }, // Bar 6: F
        { root: 52, type: 1 }, // Bar 7: E
        { root: 50, type: 0 }, // Bar 8: Dm (Minor)
        { root: 57, type: 0 }, // Bar 9: Am
        { root: 52, type: 1 }, // Bar 10: E
        { root: 57, type: 0 }, // Bar 11: Am
    ];

    const playKick = (time: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(analyser); 
      gain.connect(ctx.destination);

      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);
      
      gain.gain.setValueAtTime(0.8, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

      osc.start(time);
      osc.stop(time + 0.15);
    };

    const playSnare = (time: number) => {
        const bufferSize = ctx.sampleRate * 0.1;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) > 0 ? 0.4 : -0.4; 
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2500;

        const gain = ctx.createGain();
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(analyser);
        gain.connect(ctx.destination);

        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        
        noise.start(time);
    };

    const playLead = (time: number, freq: number, type: 'square' | 'sawtooth' = 'square', vol = 0.1, length = 0.2) => {
       const osc = ctx.createOscillator();
       const gain = ctx.createGain();
       
       osc.type = type;
       osc.frequency.value = freq;
       
       // Subtle Vibrato
       const vibrato = ctx.createOscillator();
       vibrato.frequency.value = 5; 
       const vibGain = ctx.createGain();
       vibGain.gain.value = 3; 
       vibrato.connect(vibGain);
       vibGain.connect(osc.frequency);
       vibrato.start(time);

       osc.connect(gain);
       gain.connect(analyser);
       gain.connect(ctx.destination);

       // Envelope
       gain.gain.setValueAtTime(vol, time);
       gain.gain.linearRampToValueAtTime(vol * 0.8, time + 0.05);
       gain.gain.linearRampToValueAtTime(0, time + length);

       osc.start(time);
       osc.stop(time + length + 0.05);
    };

    const playBass = (time: number, freq: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.value = freq; 

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 6; 
        filter.frequency.setValueAtTime(150, time);
        filter.frequency.linearRampToValueAtTime(600, time + 0.1);
        filter.frequency.linearRampToValueAtTime(150, time + 0.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(analyser);
        gain.connect(ctx.destination);

        gain.gain.setValueAtTime(0.4, time);
        gain.gain.linearRampToValueAtTime(0, time + 0.2);

        osc.start(time);
        osc.stop(time + 0.2);
    };

    const scheduler = () => {
       while (nextNoteTimeRef.current < ctx.currentTime + scheduleAheadTime) {
           const s = sequenceStepRef.current;
           const time = nextNoteTimeRef.current;
           
           // 12 Bars * 16 steps = 192 steps total loop
           const currentBarIndex = Math.floor(s / 16) % 12;
           const chord = progression[currentBarIndex];
           
           // DRUMS
           // Kick: 4 on the floor + syncopation
           if (s % 4 === 0) playKick(time);
           // Fill at end of 4th, 8th, 12th bars
           if ((currentBarIndex + 1) % 4 === 0 && s % 16 > 10 && s % 2 === 0) playKick(time);
           
           // Snare: Standard backbeat
           if (s % 16 === 4 || s % 16 === 12) playSnare(time);

           // BASS
           // Octave Down (-12 semitones)
           const bassNote = chord.root - 12;
           // Gallop rhythm: x-xx-x-xx
           if (s % 4 !== 2) {
             playBass(time, mtof(bassNote));
           }

           // LEAD ARPEGGIO
           // Pattern: Root, 3rd, 5th, Octave
           // Intervals: Minor(0,3,7,12) vs Major(0,4,7,12)
           const intervals = chord.type === 0 ? [0, 3, 7, 12] : [0, 4, 7, 12];
           
           // Varies pattern based on bar position to make it less repetitive
           let noteOffset = 0;
           if (currentBarIndex % 2 === 0) {
              // Ascending: 0, 1, 2, 3
              noteOffset = intervals[s % 4];
           } else {
              // Up-Down: 0, 2, 3, 1 -> indices of intervals array
              const pattern = [0, 2, 3, 1];
              noteOffset = intervals[pattern[s % 4]];
           }
           
           // Play octave up
           const leadNote = chord.root + 12 + noteOffset;
           playLead(time, mtof(leadNote), 'square', 0.08, 0.2);

           // HARMONY / COUNTERPOINT
           // Adds depth in later bars
           if (currentBarIndex >= 4) {
               if (s % 2 === 0) { // 8th notes
                   // Play the 5th or Root of the chord, held longer
                   const harmonyInterval = (s % 4 === 0) ? 7 : 0; // Toggle 5th and Root
                   const harmonyNote = chord.root + harmonyInterval;
                   playLead(time, mtof(harmonyNote), 'sawtooth', 0.04, 0.4);
               }
           }

           // Advance
           const sixteenthNoteTime = secondsPerBeat / 4;
           nextNoteTimeRef.current += sixteenthNoteTime;
           sequenceStepRef.current = (sequenceStepRef.current + 1) % 192; // 12 * 16
       }
       
       if (isRunning) {
            schedulerTimerRef.current = window.setTimeout(scheduler, lookahead);
       }
    };

    nextNoteTimeRef.current = ctx.currentTime + 0.1;
    scheduler();

  }, [isRunning]);

  const initAudio = useCallback(async () => {
    cleanup();
    
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048; // High resolution for visuals
      analyser.smoothingTimeConstant = 0.85; // Smoother

      if (mode === VisualizerMode.Microphone) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        sourceRef.current = source;
      } else if (mode === VisualizerMode.Music) {
        scheduleMusic(audioCtx, analyser);
      } else {
        // Simulation does not use audio context
        audioCtx.close();
        return;
      }

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      analyze();

    } catch (err) {
      console.error("Error initializing audio:", err);
    }
  }, [mode, cleanup, scheduleMusic]);

  const analyze = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Precise band splitting
    const bassLimit = Math.floor(bufferLength * 0.05); 
    const midLimit = Math.floor(bufferLength * 0.4);

    let bassSum = 0;
    let midSum = 0;
    let trebleSum = 0;

    for (let i = 0; i < bufferLength; i++) {
      if (i < bassLimit) bassSum += dataArray[i];
      else if (i < midLimit) midSum += dataArray[i];
      else trebleSum += dataArray[i];
    }

    const bass = bassSum / bassLimit;
    const mid = midSum / (midLimit - bassLimit);
    const treble = trebleSum / (bufferLength - midLimit);
    const volume = (bass + mid + treble) / 3;

    setAudioData({ 
        bass: bass * 1.3,
        mid, 
        treble: treble * 1.5,
        volume 
    });

    if (isRunning) {
      rafIdRef.current = requestAnimationFrame(analyze);
    }
  };

  useEffect(() => {
    if (isRunning) {
       if (mode === VisualizerMode.Simulation) {
            const simulate = () => {
                const time = Date.now() / 1000;
                setAudioData({
                bass: 100 + Math.sin(time * 8) * 90, 
                mid: 128 + Math.cos(time * 3) * 50,
                treble: 128 + Math.sin(time * 10) * 80,
                volume: 150
                });
                rafIdRef.current = requestAnimationFrame(simulate);
            };
            simulate();
       } else {
            if (!audioContextRef.current) {
                initAudio();
            } else {
                if (audioContextRef.current.state === 'suspended') {
                    audioContextRef.current.resume();
                }
                analyze();
                // Ensure music restarts if switching back
                if (mode === VisualizerMode.Music && !schedulerTimerRef.current) {
                    initAudio(); 
                }
            }
       }
    } else {
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        if (audioContextRef.current && audioContextRef.current.state === 'running') {
            audioContextRef.current.suspend();
        }
        if (schedulerTimerRef.current) {
            clearTimeout(schedulerTimerRef.current);
            schedulerTimerRef.current = null;
        }
    }

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (schedulerTimerRef.current) clearTimeout(schedulerTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, isRunning]); 

  useEffect(() => {
      if (isRunning) initAudio();
  }, [mode, initAudio]);

  return { audioData, initAudio };
};
