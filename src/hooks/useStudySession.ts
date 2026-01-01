import { useState, useCallback, useEffect, useRef } from "react";
import { AutoplayMode } from "@/types/vocabulary";

export type RepeatMode = "off" | "chinese" | "english" | "chinese-to-english" | "english-to-chinese";

export type DisplayMode = "chinese" | "english" | "both";

interface UseStudySessionProps {
  totalWords: number;
  onFlip: () => void;
  speakChinese: (text: string) => Promise<void>;
  speakEnglish: (text: string) => Promise<void>;
  getCurrentWord: () => { chinese: string; english: string } | null;
  isFlipped: boolean;
  languageGap: number;
  nextDelay: number;
}

export function useStudySession({
  totalWords,
  onFlip,
  speakChinese,
  speakEnglish,
  getCurrentWord,
  isFlipped,
  languageGap,
  nextDelay,
}: UseStudySessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startTime] = useState<Date>(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Autoplay state
  const [autoplayMode, setAutoplayModeState] = useState<AutoplayMode>("off");
  const [isAutoplayActive, setIsAutoplayActive] = useState(false);
  
  // Repeat state
  const [repeatMode, setRepeatModeState] = useState<RepeatMode>("off");
  const [isRepeatActive, setIsRepeatActive] = useState(false);
  
  // Display state - what should be shown on the card
  const [displayMode, setDisplayMode] = useState<DisplayMode>("both");
  const [currentlySpoken, setCurrentlySpoken] = useState<"chinese" | "english" | null>(null);
  
  // Refs for async control
  const cancelRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Store timing values in refs so async loops can access latest values
  const languageGapRef = useRef(languageGap);
  const nextDelayRef = useRef(nextDelay);
  
  useEffect(() => {
    languageGapRef.current = languageGap;
  }, [languageGap]);
  
  useEffect(() => {
    nextDelayRef.current = nextDelay;
  }, [nextDelay]);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelRef.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Helper to wait with cancel support
  const wait = (ms: number) => new Promise<void>((resolve) => {
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      resolve();
    }, ms);
  });

  // Set autoplay mode (mutually exclusive with repeat)
  const setAutoplayMode = useCallback((mode: AutoplayMode) => {
    // Cancel any running operation
    cancelRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (mode !== "off") {
      // Deactivate repeat
      setRepeatModeState("off");
      setIsRepeatActive(false);
    }
    
    setAutoplayModeState(mode);
    setIsAutoplayActive(mode !== "off");
    
    // Set display mode based on autoplay mode
    if (mode === "chinese" || mode === "chinese-to-english") {
      setDisplayMode("chinese");
    } else if (mode === "english" || mode === "english-to-chinese") {
      setDisplayMode("english");
    } else {
      setDisplayMode("both");
    }
  }, []);

  // Set repeat mode (mutually exclusive with autoplay)
  const setRepeatMode = useCallback((mode: RepeatMode) => {
    // Cancel any running operation
    cancelRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (mode !== "off") {
      // Deactivate autoplay
      setAutoplayModeState("off");
      setIsAutoplayActive(false);
    }
    
    setRepeatModeState(mode);
    setIsRepeatActive(mode !== "off");
    
    // Set display mode based on repeat mode
    if (mode === "chinese" || mode === "chinese-to-english") {
      setDisplayMode("chinese");
    } else if (mode === "english" || mode === "english-to-chinese") {
      setDisplayMode("english");
    } else {
      setDisplayMode("both");
    }
  }, []);

  // Autoplay logic
  useEffect(() => {
    if (!isAutoplayActive || autoplayMode === "off") return;
    
    cancelRef.current = false;
    
    const runAutoplay = async () => {
      while (!cancelRef.current && isAutoplayActive) {
        const word = getCurrentWord();
        if (!word || cancelRef.current) break;
        
        try {
          switch (autoplayMode) {
            case "chinese":
              setDisplayMode("chinese");
              setCurrentlySpoken("chinese");
              await speakChinese(word.chinese);
              break;
              
            case "english":
              setDisplayMode("english");
              setCurrentlySpoken("english");
              await speakEnglish(word.english);
              break;
              
            case "chinese-to-english":
              // Show and speak Chinese
              setDisplayMode("chinese");
              setCurrentlySpoken("chinese");
              await speakChinese(word.chinese);
              if (cancelRef.current) break;
              
              // Wait for language gap
              await wait(languageGapRef.current * 1000);
              if (cancelRef.current) break;
              
              // Show and speak English
              setDisplayMode("english");
              setCurrentlySpoken("english");
              await speakEnglish(word.english);
              break;
              
            case "english-to-chinese":
              // Show and speak English
              setDisplayMode("english");
              setCurrentlySpoken("english");
              await speakEnglish(word.english);
              if (cancelRef.current) break;
              
              // Wait for language gap
              await wait(languageGapRef.current * 1000);
              if (cancelRef.current) break;
              
              // Show and speak Chinese
              setDisplayMode("chinese");
              setCurrentlySpoken("chinese");
              await speakChinese(word.chinese);
              break;
          }
          
          if (cancelRef.current) break;
          
          setCurrentlySpoken(null);
          
          // Wait before next word
          await wait(nextDelayRef.current * 1000);
          if (cancelRef.current) break;
          
          // Move to next word
          setCurrentIndex((prev) => (prev + 1) % totalWords);
          
          // Reset display for next word based on mode
          if (autoplayMode === "chinese" || autoplayMode === "chinese-to-english") {
            setDisplayMode("chinese");
          } else {
            setDisplayMode("english");
          }
          
        } catch (error) {
          console.error("Autoplay error:", error);
          break;
        }
      }
      
      setCurrentlySpoken(null);
    };
    
    // Small delay to prevent rapid re-triggering
    const startTimeout = setTimeout(runAutoplay, 100);
    
    return () => {
      clearTimeout(startTimeout);
      cancelRef.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isAutoplayActive, autoplayMode, currentIndex, totalWords, speakChinese, speakEnglish, getCurrentWord]);

  // Repeat logic - loops on current word
  useEffect(() => {
    if (!isRepeatActive || repeatMode === "off") return;
    
    cancelRef.current = false;
    
    const runRepeat = async () => {
      while (!cancelRef.current && isRepeatActive) {
        const word = getCurrentWord();
        if (!word || cancelRef.current) break;
        
        try {
          switch (repeatMode) {
            case "chinese":
              setDisplayMode("chinese");
              setCurrentlySpoken("chinese");
              await speakChinese(word.chinese);
              break;
              
            case "english":
              setDisplayMode("english");
              setCurrentlySpoken("english");
              await speakEnglish(word.english);
              break;
              
            case "chinese-to-english":
              // Show and speak Chinese
              setDisplayMode("chinese");
              setCurrentlySpoken("chinese");
              await speakChinese(word.chinese);
              if (cancelRef.current) break;
              
              // Wait for translation gap
              await wait(languageGapRef.current * 1000);
              if (cancelRef.current) break;
              
              // Show and speak English
              setDisplayMode("english");
              setCurrentlySpoken("english");
              await speakEnglish(word.english);
              break;
              
            case "english-to-chinese":
              // Show and speak English
              setDisplayMode("english");
              setCurrentlySpoken("english");
              await speakEnglish(word.english);
              if (cancelRef.current) break;
              
              // Wait for translation gap
              await wait(languageGapRef.current * 1000);
              if (cancelRef.current) break;
              
              // Show and speak Chinese
              setDisplayMode("chinese");
              setCurrentlySpoken("chinese");
              await speakChinese(word.chinese);
              break;
          }
          
          if (cancelRef.current) break;
          
          setCurrentlySpoken(null);
          
          // Wait before repeating (use same "next translation" timing)
          await wait(languageGapRef.current * 1000);
          if (cancelRef.current) break;
          
          // Reset display for next loop based on mode
          if (repeatMode === "chinese" || repeatMode === "chinese-to-english") {
            setDisplayMode("chinese");
          } else {
            setDisplayMode("english");
          }
          
        } catch (error) {
          console.error("Repeat error:", error);
          break;
        }
      }
      
      setCurrentlySpoken(null);
    };
    
    // Small delay to prevent rapid re-triggering
    const startTimeout = setTimeout(runRepeat, 100);
    
    return () => {
      clearTimeout(startTimeout);
      cancelRef.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isRepeatActive, repeatMode, currentIndex, speakChinese, speakEnglish, getCurrentWord]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalWords);
    setDisplayMode("both");
  }, [totalWords]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalWords) % totalWords);
    setDisplayMode("both");
  }, [totalWords]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, totalWords - 1)));
    // When seeking, restart from new position if autoplay/repeat is active
    // The effect will pick up the new currentIndex
  }, [totalWords]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Stop all playback
  const stopAll = useCallback(() => {
    cancelRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setAutoplayModeState("off");
    setIsAutoplayActive(false);
    setRepeatModeState("off");
    setIsRepeatActive(false);
    setDisplayMode("both");
    setCurrentlySpoken(null);
  }, []);

  return {
    currentIndex,
    elapsedTime,
    formattedTime: formatTime(elapsedTime),
    
    // Autoplay
    autoplayMode,
    setAutoplayMode,
    isAutoplayActive,
    
    // Repeat
    repeatMode,
    setRepeatMode,
    isRepeatActive,
    
    // Display
    displayMode,
    currentlySpoken,
    
    // Timing values are passed in as props, no need to return setters
    
    // Navigation
    goToNext,
    goToPrevious,
    goToIndex,
    stopAll,
    
    completionPercentage: totalWords > 0 ? ((currentIndex + 1) / totalWords) * 100 : 0,
  };
}
