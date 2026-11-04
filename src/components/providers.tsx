"use client";

import type { ReactNode } from "react";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";

import { MotionPreferenceProvider, useMotionPreference } from "@/components/motion/motion-preference";
import { SoundPreferenceProvider } from "@/components/motion/sound-preference";
import { TextSizeProvider } from "@/components/text-size-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";

function MotionRoot({ children }: { children: ReactNode }) {
  const { reduceMotion } = useMotionPreference();

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion={reduceMotion ? "always" : "never"}>
        <ToastProvider>{children}</ToastProvider>
      </MotionConfig>
    </LazyMotion>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <TextSizeProvider>
        <MotionPreferenceProvider>
          <SoundPreferenceProvider>
            <MotionRoot>{children}</MotionRoot>
          </SoundPreferenceProvider>
        </MotionPreferenceProvider>
      </TextSizeProvider>
    </ThemeProvider>
  );
}
