import { useState, useCallback, useEffect, useRef } from "react";
import { AutoplayMode } from "@/types/vocabulary";

export type RepeatMode =
  | "off"
  | "chinese"
  | "english"
  | "chinese-to-english"
  | "english-to-chinese";

export type DisplayMode = "chinese" | "english" | "both";

// Repeat count: 0 = infinite, any positive number = that many times
export type RepeatCount = number;

interface UseStudySessionProps {
  totalWords: number;
  onFlip: () => void;
  speakChinese: (text: string) => Promise<void>;
  speakEnglish: (text: string) => Promise<void>;
  getWordAtIndex: (index: number) => { chinese: string; english: string } | null;
  isFlipped: boolean;
  languageGap: number;
  nextDelay: number;
}

export function useStudySession({
  totalWords,
  onFlip,
  speakChinese,
  speakEnglish,
  getWordAtIndex,
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

  // Repeat state (standalone repeat)
  const [repeatMode, setRepeatModeState] = useState<RepeatMode>("off");
  const [isRepeatActive, setIsRepeatActive] = useState(false);

  // Autoplay repeat: repeat current word N times before moving on (0 = infinite)
  const [autoplayRepeatCount, setAutoplayRepeatCount] = useState<RepeatCount>(0);
  const [isAutoplayRepeating, setIsAutoplayRepeating] = useState(false);

  // Display state - what should be shown on the card
  const [displayMode, setDisplayMode] = useState<DisplayMode>("both");
  const [currentlySpoken, setCurrentlySpoken] = useState<"chinese" | "english" | null>(null);

  // One shared playback run id so we never end up with overlapping loops.
  const playbackRunIdRef = useRef(0);

  // Cancelable wait() helper
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waitResolveRef = useRef<(() => void) | null>(null);

  // Internal key used to restart playback immediately (e.g., after seeking)
  const [playbackRestartKey, setPlaybackRestartKey] = useState(0);

  // Store timing values in refs so async loops can access latest values
  const languageGapRef = useRef(languageGap);
  const nextDelayRef = useRef(nextDelay);
  const autoplayRepeatCountRef = useRef(autoplayRepeatCount);
  const isAutoplayRepeatingRef = useRef(isAutoplayRepeating);

  useEffect(() => {
    languageGapRef.current = languageGap;
  }, [languageGap]);

  useEffect(() => {
    nextDelayRef.current = nextDelay;
  }, [nextDelay]);

  useEffect(() => {
    autoplayRepeatCountRef.current = autoplayRepeatCount;
  }, [autoplayRepeatCount]);

  useEffect(() => {
    isAutoplayRepeatingRef.current = isAutoplayRepeating;
  }, [isAutoplayRepeating]);

  const clearPendingWait = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (waitResolveRef.current) {
      const resolve = waitResolveRef.current;
      waitResolveRef.current = null;
      resolve();
    }
  }, []);

  const bumpPlaybackRunId = useCallback(() => {
    playbackRunIdRef.current += 1;
  }, []);

  const cancelPlayback = useCallback(() => {
    bumpPlaybackRunId();
    clearPendingWait();
    setCurrentlySpoken(null);
  }, [bumpPlaybackRunId, clearPendingWait]);

  const wait = useCallback(
    (ms: number) =>
      new Promise<void>((resolve) => {
        // Ensure there is never more than one pending wait at a time.
        clearPendingWait();

        waitResolveRef.current = resolve;
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
          waitResolveRef.current = null;
          resolve();
        }, ms);
      }),
    [clearPendingWait]
  );

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
      bumpPlaybackRunId();
      clearPendingWait();
    };
  }, [bumpPlaybackRunId, clearPendingWait]);

  const syncDisplayModeForAutoplay = useCallback((mode: AutoplayMode) => {
    if (mode === "chinese" || mode === "chinese-to-english") {
      setDisplayMode("chinese");
    } else if (mode === "english" || mode === "english-to-chinese") {
      setDisplayMode("english");
    } else {
      setDisplayMode("both");
    }
  }, []);

  const syncDisplayModeForRepeat = useCallback((mode: RepeatMode) => {
    if (mode === "chinese" || mode === "chinese-to-english") {
      setDisplayMode("chinese");
    } else if (mode === "english" || mode === "english-to-chinese") {
      setDisplayMode("english");
    } else {
      setDisplayMode("both");
    }
  }, []);

  // Play one cycle of a mode (chinese, english, or dual)
  const playOneCycle = useCallback(
    async (
      mode: AutoplayMode | RepeatMode,
      word: { chinese: string; english: string },
      runId: number
    ): Promise<boolean> => {
      if (mode === "off") return true;

      try {
        switch (mode) {
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
            setDisplayMode("chinese");
            setCurrentlySpoken("chinese");
            await speakChinese(word.chinese);
            if (playbackRunIdRef.current !== runId) return false;

            await wait(languageGapRef.current * 1000);
            if (playbackRunIdRef.current !== runId) return false;

            setDisplayMode("english");
            setCurrentlySpoken("english");
            await speakEnglish(word.english);
            break;

          case "english-to-chinese":
            setDisplayMode("english");
            setCurrentlySpoken("english");
            await speakEnglish(word.english);
            if (playbackRunIdRef.current !== runId) return false;

            await wait(languageGapRef.current * 1000);
            if (playbackRunIdRef.current !== runId) return false;

            setDisplayMode("chinese");
            setCurrentlySpoken("chinese");
            await speakChinese(word.chinese);
            break;
        }

        setCurrentlySpoken(null);
        return playbackRunIdRef.current === runId;
      } catch (error) {
        console.error("Playback error:", error);
        return false;
      }
    },
    [speakChinese, speakEnglish, wait]
  );

  // Set autoplay mode (mutually exclusive with repeat)
  const setAutoplayMode = useCallback(
    (mode: AutoplayMode) => {
      cancelPlayback();

      if (mode !== "off") {
        // Deactivate repeat
        setRepeatModeState("off");
        setIsRepeatActive(false);
        setIsAutoplayRepeating(false);
      }

      setAutoplayModeState(mode);
      setIsAutoplayActive(mode !== "off");
      syncDisplayModeForAutoplay(mode);
    },
    [cancelPlayback, syncDisplayModeForAutoplay]
  );

  // Set repeat mode (mutually exclusive with autoplay)
  const setRepeatMode = useCallback(
    (mode: RepeatMode) => {
      cancelPlayback();

      if (mode !== "off") {
        // Deactivate autoplay
        setAutoplayModeState("off");
        setIsAutoplayActive(false);
        setIsAutoplayRepeating(false);
      }

      setRepeatModeState(mode);
      setIsRepeatActive(mode !== "off");
      syncDisplayModeForRepeat(mode);
    },
    [cancelPlayback, syncDisplayModeForRepeat]
  );

  // Toggle autoplay repeat during autoplay
  const toggleAutoplayRepeat = useCallback(() => {
    if (!isAutoplayActive) return;
    
    cancelPlayback();
    setIsAutoplayRepeating((prev) => !prev);
    setPlaybackRestartKey((k) => k + 1);
  }, [isAutoplayActive, cancelPlayback]);

  // Autoplay logic - plays through words one by one without repeating
  useEffect(() => {
    if (!isAutoplayActive || autoplayMode === "off" || totalWords <= 0) return;

    // Start a brand new run (prevents overlapping loops)
    const runId = playbackRunIdRef.current + 1;
    playbackRunIdRef.current = runId;

    let index = Math.max(0, Math.min(currentIndex, totalWords - 1));

    const runAutoplay = async () => {
      while (playbackRunIdRef.current === runId) {
        const word = getWordAtIndex(index);
        if (!word) break;

        // Play the word once according to the mode
        const success = await playOneCycle(autoplayMode, word, runId);
        if (!success) break;

        if (playbackRunIdRef.current !== runId) break;

        // Wait before next word
        await wait(nextDelayRef.current * 1000);
        if (playbackRunIdRef.current !== runId) break;

        // Move to next word
        index = (index + 1) % totalWords;
        setCurrentIndex(index);

        // Reset display for next word based on mode
        if (autoplayMode === "chinese" || autoplayMode === "chinese-to-english") {
          setDisplayMode("chinese");
        } else {
          setDisplayMode("english");
        }
      }

      setCurrentlySpoken(null);
    };

    runAutoplay();

    return () => {
      bumpPlaybackRunId();
      clearPendingWait();
      setCurrentlySpoken(null);
    };
  }, [
    isAutoplayActive,
    autoplayMode,
    totalWords,
    currentIndex,
    getWordAtIndex,
    playOneCycle,
    wait,
    bumpPlaybackRunId,
    clearPendingWait,
    playbackRestartKey,
  ]);

  // Repeat logic - loops on current word N times (standalone repeat mode)
  useEffect(() => {
    if (!isRepeatActive || repeatMode === "off" || totalWords <= 0) return;

    const runId = playbackRunIdRef.current + 1;
    playbackRunIdRef.current = runId;

    const index = Math.max(0, Math.min(currentIndex, totalWords - 1));

    const runRepeat = async () => {
      // How many times to repeat (0 = infinite)
      const repeatTimes = autoplayRepeatCountRef.current === 0
        ? Infinity
        : autoplayRepeatCountRef.current;

      let cycles = 0;
      while (cycles < repeatTimes && playbackRunIdRef.current === runId) {
        const word = getWordAtIndex(index);
        if (!word) break;

        const success = await playOneCycle(repeatMode, word, runId);
        if (!success) break;

        cycles++;

        if (playbackRunIdRef.current !== runId) break;

        // Wait before next repeat cycle (if more cycles to go)
        if (cycles < repeatTimes) {
          await wait(nextDelayRef.current * 1000);
          if (playbackRunIdRef.current !== runId) break;

          // Reset display for next loop based on mode
          if (repeatMode === "chinese" || repeatMode === "chinese-to-english") {
            setDisplayMode("chinese");
          } else {
            setDisplayMode("english");
          }
        }
      }

      // Stop repeat mode when done (unless infinite)
      if (autoplayRepeatCountRef.current !== 0 && cycles >= repeatTimes) {
        setRepeatModeState("off");
        setIsRepeatActive(false);
        setDisplayMode("both");
      }

      setCurrentlySpoken(null);
    };

    runRepeat();

    return () => {
      bumpPlaybackRunId();
      clearPendingWait();
      setCurrentlySpoken(null);
    };
  }, [
    isRepeatActive,
    repeatMode,
    totalWords,
    currentIndex,
    getWordAtIndex,
    playOneCycle,
    wait,
    bumpPlaybackRunId,
    clearPendingWait,
    playbackRestartKey,
  ]);

  const goToNext = useCallback(() => {
    cancelPlayback();
    setCurrentIndex((prev) => (prev + 1) % totalWords);
    setDisplayMode("both");
    if (isAutoplayActive || isRepeatActive) {
      setPlaybackRestartKey((k) => k + 1);
    }
  }, [cancelPlayback, totalWords, isAutoplayActive, isRepeatActive]);

  const goToPrevious = useCallback(() => {
    cancelPlayback();
    setCurrentIndex((prev) => (prev - 1 + totalWords) % totalWords);
    setDisplayMode("both");
    if (isAutoplayActive || isRepeatActive) {
      setPlaybackRestartKey((k) => k + 1);
    }
  }, [cancelPlayback, totalWords, isAutoplayActive, isRepeatActive]);

  const goToIndex = useCallback(
    (index: number) => {
      const nextIndex = Math.max(0, Math.min(index, totalWords - 1));
      cancelPlayback();
      setCurrentIndex(nextIndex);

      // Keep the card visuals coherent immediately after seeking.
      if (isAutoplayActive) {
        syncDisplayModeForAutoplay(autoplayMode);
      } else if (isRepeatActive) {
        syncDisplayModeForRepeat(repeatMode);
      } else {
        setDisplayMode("both");
      }

      // If playback is active, restart from the new index right away.
      if (isAutoplayActive || isRepeatActive) {
        setPlaybackRestartKey((k) => k + 1);
      }
    },
    [
      totalWords,
      cancelPlayback,
      isAutoplayActive,
      isRepeatActive,
      autoplayMode,
      repeatMode,
      syncDisplayModeForAutoplay,
      syncDisplayModeForRepeat,
    ]
  );

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Stop all playback
  const stopAll = useCallback(() => {
    cancelPlayback();
    setAutoplayModeState("off");
    setIsAutoplayActive(false);
    setRepeatModeState("off");
    setIsRepeatActive(false);
    setIsAutoplayRepeating(false);
    setDisplayMode("both");
    setCurrentlySpoken(null);
  }, [cancelPlayback]);

  return {
    currentIndex,
    elapsedTime,
    formattedTime: formatTime(elapsedTime),

    // Autoplay
    autoplayMode,
    setAutoplayMode,
    isAutoplayActive,

    // Autoplay repeat
    autoplayRepeatCount,
    setAutoplayRepeatCount,
    isAutoplayRepeating,
    toggleAutoplayRepeat,

    // Repeat
    repeatMode,
    setRepeatMode,
    isRepeatActive,

    // Display
    displayMode,
    currentlySpoken,

    // Navigation
    goToNext,
    goToPrevious,
    goToIndex,
    stopAll,

    completionPercentage: totalWords > 0 ? ((currentIndex + 1) / totalWords) * 100 : 0,
  };
}
