"use client";

import { useEffect, useRef, useState } from "react";

import { useMotionPreference } from "./motion-preference";

export function useAmbientActivity<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const { reduceMotion } = useMotionPreference();
  const [onScreen, setOnScreen] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let observer: IntersectionObserver | undefined;

    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => setOnScreen(entries.some((entry) => entry.isIntersecting)),
        { rootMargin: "120px" },
      );
      observer.observe(element);
    }

    const syncVisibility = () =>
      setTabVisible(document.visibilityState !== "hidden");

    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);

    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  return {
    ref,
    active: onScreen && tabVisible && !reduceMotion,
  };
}
