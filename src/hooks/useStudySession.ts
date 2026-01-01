import { useState, useCallback, useEffect, useRef } from "react";
import { AutoplayMode } from "@/types/vocabulary";

export type RepeatMode =
  | "off"
  | "chinese"
  | "english"
  | "chinese-to-english"
  | "english-to-chinese";

export type DisplayMode = "chinese" | "english" | "both";

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

  // Repeat state
  const [repeatMode, setRepeatModeState] = useState<RepeatMode>("off");
  const [isRepeatActive, setIsRepeatActive] = useState(false);

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

  useEffect(() => {
    languageGapRef.current = languageGap;
  }, [languageGap]);

  useEffect(() => {
    nextDelayRef.current = nextDelay;
  }, [nextDelay]);

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

  // Set autoplay mode (mutually exclusive with repeat)
  const setAutoplayMode = useCallback(
    (mode: AutoplayMode) => {
      cancelPlayback();

      if (mode !== "off") {
        // Deactivate repeat
        setRepeatModeState("off");
        setIsRepeatActive(false);
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
      }

      setRepeatModeState(mode);
      setIsRepeatActive(mode !== "off");
      syncDisplayModeForRepeat(mode);
    },
    [cancelPlayback, syncDisplayModeForRepeat]
  );

  // Autoplay logic
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
              setDisplayMode("chinese");
              setCurrentlySpoken("chinese");
              await speakChinese(word.chinese);
              if (playbackRunIdRef.current !== runId) break;

              await wait(languageGapRef.current * 1000);
              if (playbackRunIdRef.current !== runId) break;

              setDisplayMode("english");
              setCurrentlySpoken("english");
              await speakEnglish(word.english);
              break;

            case "english-to-chinese":
              setDisplayMode("english");
              setCurrentlySpoken("english");
              await speakEnglish(word.english);
              if (playbackRunIdRef.current !== runId) break;

              await wait(languageGapRef.current * 1000);
              if (playbackRunIdRef.current !== runId) break;

              setDisplayMode("chinese");
              setCurrentlySpoken("chinese");
              await speakChinese(word.chinese);
              break;
          }

          if (playbackRunIdRef.current !== runId) break;

          setCurrentlySpoken(null);

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
        } catch (error) {
          console.error("Autoplay error:", error);
          break;
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
    speakChinese,
    speakEnglish,
    wait,
    bumpPlaybackRunId,
    clearPendingWait,
    playbackRestartKey,
  ]);

  // Repeat logic - loops on current word
  useEffect(() => {
    if (!isRepeatActive || repeatMode === "off" || totalWords <= 0) return;

    const runId = playbackRunIdRef.current + 1;
    playbackRunIdRef.current = runId;

    const index = Math.max(0, Math.min(currentIndex, totalWords - 1));

    const runRepeat = async () => {
      while (playbackRunIdRef.current === runId) {
        const word = getWordAtIndex(index);
        if (!word) break;

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
              setDisplayMode("chinese");
              setCurrentlySpoken("chinese");
              await speakChinese(word.chinese);
              if (playbackRunIdRef.current !== runId) break;

              // Next translation gap
              await wait(languageGapRef.current * 1000);
              if (playbackRunIdRef.current !== runId) break;

              setDisplayMode("english");
              setCurrentlySpoken("english");
              await speakEnglish(word.english);
              break;

            case "english-to-chinese":
              setDisplayMode("english");
              setCurrentlySpoken("english");
              await speakEnglish(word.english);
              if (playbackRunIdRef.current !== runId) break;

              // Next translation gap
              await wait(languageGapRef.current * 1000);
              if (playbackRunIdRef.current !== runId) break;

              setDisplayMode("chinese");
              setCurrentlySpoken("chinese");
              await speakChinese(word.chinese);
              break;
          }

          if (playbackRunIdRef.current !== runId) break;

          setCurrentlySpoken(null);

          // Repeat delay uses the same "Next translation" timing
          await wait(languageGapRef.current * 1000);
          if (playbackRunIdRef.current !== runId) break;

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
    speakChinese,
    speakEnglish,
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
