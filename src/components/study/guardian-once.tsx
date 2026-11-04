"use client";

import { useEffect, useState } from "react";

import { GuardianAngel } from "@/components/motion/guardian-angel";

const PREFIX = "yod:guardian:";

export function GuardianOnce({ date, line }: { date: string; line: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setVisible(!window.localStorage.getItem(`${PREFIX}${date}`));
      } catch {
        setVisible(false);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [date]);

  if (!visible) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(`${PREFIX}${date}`, "1");
    } catch {
      // The note still closes for this visit.
    }
    setVisible(false);
  }

  return <GuardianAngel line={line} onDismiss={dismiss} />;
}
