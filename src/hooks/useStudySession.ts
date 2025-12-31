import { useState, useCallback, useEffect, useRef } from "react";
import { AutoplayMode } from "@/types/vocabulary";

interface UseStudySessionProps {
  totalWords: number;
  onNext: () => void;
  onFlip: () => void;
  speakChinese: (text: string) => Promise<void>;
  speakEnglish: (text: string) => Promise<void>;
  getCurrentWord: () => { chinese: string; english: string } | null;
  isFlipped: boolean;
}

export function useStudySession({
  totalWords,
  onNext,
  onFlip,
  speakChinese,
  speakEnglish,
  getCurrentWord,
  isFlipped,
}: UseStudySessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startTime] = useState<Date>(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [autoplayMode, setAutoplayMode] = useState<AutoplayMode>("off");
  const [nextDelay, setNextDelay] = useState(3);
  const [languageGap, setLanguageGap] = useState(1.5);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);
  const isAutoplayingRef = useRef(false);
  const autoplayCancelledRef = useRef(false);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Autoplay logic
  useEffect(() => {
    // Clear any existing timeout
    if (autoplayRef.current) {
      clearTimeout(autoplayRef.current);
      autoplayRef.current = null;
    }

    if (autoplayMode === "off") {
      autoplayCancelledRef.current = true;
      isAutoplayingRef.current = false;
      return;
    }

    // Prevent re-entry if already autoplaying
    if (isAutoplayingRef.current) {
      return;
    }

    autoplayCancelledRef.current = false;

    const runAutoplay = async () => {
      if (autoplayCancelledRef.current) return;
      
      isAutoplayingRef.current = true;
      const word = getCurrentWord();
      
      if (!word) {
        isAutoplayingRef.current = false;
        return;
      }

      try {
        switch (autoplayMode) {
          case "chinese":
            await speakChinese(word.chinese);
            break;
          case "english":
            await speakEnglish(word.english);
            break;
          case "chinese-to-english":
            await speakChinese(word.chinese);
            if (autoplayCancelledRef.current) break;
            await new Promise((r) => setTimeout(r, languageGap * 1000));
            if (autoplayCancelledRef.current) break;
            if (!isFlipped) onFlip();
            await speakEnglish(word.english);
            break;
          case "english-to-chinese":
            await speakEnglish(word.english);
            if (autoplayCancelledRef.current) break;
            await new Promise((r) => setTimeout(r, languageGap * 1000));
            if (autoplayCancelledRef.current) break;
            if (!isFlipped) onFlip();
            await speakChinese(word.chinese);
            break;
        }

        if (autoplayCancelledRef.current) {
          isAutoplayingRef.current = false;
          return;
        }

        // Schedule next word
        autoplayRef.current = setTimeout(() => {
          isAutoplayingRef.current = false;
          if (!autoplayCancelledRef.current) {
            onNext();
          }
        }, nextDelay * 1000);
      } catch (error) {
        console.error("Autoplay error:", error);
        isAutoplayingRef.current = false;
      }
    };

    // Small delay to prevent rapid re-triggering
    const startTimeout = setTimeout(runAutoplay, 100);

    return () => {
      clearTimeout(startTimeout);
      autoplayCancelledRef.current = true;
      if (autoplayRef.current) {
        clearTimeout(autoplayRef.current);
        autoplayRef.current = null;
      }
    };
  }, [autoplayMode, currentIndex, nextDelay, languageGap, isFlipped]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalWords);
  }, [totalWords]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalWords) % totalWords);
  }, [totalWords]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, totalWords - 1)));
  }, [totalWords]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  return {
    currentIndex,
    elapsedTime,
    formattedTime: formatTime(elapsedTime),
    autoplayMode,
    setAutoplayMode,
    nextDelay,
    setNextDelay,
    languageGap,
    setLanguageGap,
    goToNext,
    goToPrevious,
    goToIndex,
    completionPercentage: totalWords > 0 ? ((currentIndex + 1) / totalWords) * 100 : 0,
  };
}
