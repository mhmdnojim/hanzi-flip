import { useState, useCallback, useRef, useEffect } from "react";
import { VoiceType } from "@/types/vocabulary";
import { supabase } from "@/integrations/supabase/client";
import { detectLanguageCodeFromText } from "@/lib/detectLanguage";
import { pickVoice } from "@/lib/voicePicker";

interface UseAudioOptions {
  /** BCP-47 locale of the card's front language (e.g. "zh-CN") */
  frontLocale?: string;
  /** BCP-47 locale of the card's back language (e.g. "en-US") */
  backLocale?: string;
}

const SOUND_EFFECTS = {
  flip: "/sounds/flip.mp3",
  correct: "/sounds/correct.mp3",
  incorrect: "/sounds/incorrect.mp3",
  navigate: "/sounds/navigate.mp3",
};

export function useAudio({ frontLocale, backLocale }: UseAudioOptions = {}) {
  const [voiceType, setVoiceType] = useState<VoiceType>("free");
  const [voiceSpeed, setVoiceSpeed] = useState(1);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [sfxMuted, setSfxMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Browser voices (Google / Microsoft) load asynchronously — keep the list fresh.
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const load = () => {
      const list = synth.getVoices();
      if (list.length) voicesRef.current = list;
    };
    load();
    synth.addEventListener?.("voiceschanged", load);
    return () => synth.removeEventListener?.("voiceschanged", load);
  }, []);

  const playFreeTTS = useCallback(
    (text: string, lang: string): Promise<void> => {
      if (voiceMuted) return Promise.resolve();
      
      if (!window.speechSynthesis) {
        console.warn("Speech synthesis not supported");
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = voiceSpeed;
        
        // Pick the best Google / Microsoft voice with the matching accent
        if (!voicesRef.current.length) voicesRef.current = window.speechSynthesis.getVoices();
        const voice = pickVoice(voicesRef.current, lang);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang;
        }
        
        utterance.onend = () => {
          setIsPlaying(false);
          resolve();
        };
        utterance.onerror = (e) => {
          console.warn("Speech synthesis error:", e);
          setIsPlaying(false);
          resolve();
        };
        
        synthRef.current = utterance;
        setIsPlaying(true);
        
        // Small delay to ensure synthesis is ready
        setTimeout(() => {
          window.speechSynthesis.speak(utterance);
        }, 50);
      });
    },
    [voiceMuted, voiceSpeed]
  );

  const playPremiumTTS = useCallback(
    async (text: string, lang: string) => {
      if (voiceMuted) return;

      try {
        setIsPlaying(true);
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ text, language: lang }),
          }
        );

        if (!response.ok) {
          throw new Error("TTS request failed");
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        return new Promise<void>((resolve) => {
          if (audioRef.current) {
            audioRef.current.pause();
          }
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          audio.onended = () => {
            setIsPlaying(false);
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          audio.onerror = () => {
            setIsPlaying(false);
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          audio.play();
        });
      } catch (error) {
        console.error("Premium TTS error:", error);
        setIsPlaying(false);
        // Fallback to free TTS
        return playFreeTTS(text, lang);
      }
    },
    [voiceMuted, playFreeTTS]
  );

  const speak = useCallback(
    (text: string, lang: string) => {
      if (voiceType === "premium") {
        return playPremiumTTS(text, lang);
      }
      return playFreeTTS(text, lang);
    },
    [voiceType, playFreeTTS, playPremiumTTS]
  );

  /** Speak the front side in the front language's voice. */
  const speakChinese = useCallback(
    (text: string) => speak(text, frontLocale || detectLanguageCodeFromText(text)),
    [speak, frontLocale]
  );

  /** Speak the back side in the back language's voice. */
  const speakEnglish = useCallback(
    (text: string) => speak(text, backLocale || detectLanguageCodeFromText(text)),
    [speak, backLocale]
  );

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playSoundEffect = useCallback(
    (effect: keyof typeof SOUND_EFFECTS) => {
      if (sfxMuted) return;
      // Sound effects would be loaded from public folder
      // For now, using Web Audio API beeps as fallback
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      const frequencies: Record<string, number> = {
        flip: 800,
        correct: 1200,
        incorrect: 300,
        navigate: 600,
      };
      
      oscillator.frequency.value = frequencies[effect] || 500;
      oscillator.type = "sine";
      gainNode.gain.value = 0.1;
      
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.1);
    },
    [sfxMuted]
  );

  return {
    voiceType,
    setVoiceType,
    voiceSpeed,
    setVoiceSpeed,
    voiceMuted,
    setVoiceMuted,
    sfxMuted,
    setSfxMuted,
    isPlaying,
    speakChinese,
    speakEnglish,
    stopSpeaking,
    playSoundEffect,
  };
}
