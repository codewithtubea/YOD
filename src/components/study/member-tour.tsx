"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpenText, Heart, MoreHorizontal, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";

const STEPS = [
	{
		title: "Start with today's chapter",
		body: "One chapter is already chosen. Tap the Bible link, read, then mark it read when you are finished.",
		icon: BookOpenText,
	},
	{
		title: "Keep one word",
		body: "The affirmation sits just below the reading. Tap it to receive the word for today.",
		icon: Sparkles,
	},
	{
		title: "Stay close to the circle",
		body: "Circle holds the people, sermons, and the private encouragement notes sent to you.",
		icon: Heart,
	},
	{
		title: "Everything else is in More",
		body: "Questions, the reading archive, weekly check-in, settings, help, and privacy all live there.",
		icon: MoreHorizontal,
	},
] as const;

export function MemberTour({
	userId,
	forceOpen = false,
}: {
	userId: string;
	forceOpen?: boolean;
}) {
	const storageKey = `yod:tour:${userId}`;
	const [open, setOpen] = useState(() => {
		if (forceOpen) return true;

		if (typeof window === "undefined") return false;

		try {
			return !window.localStorage.getItem(storageKey);
		} catch {
			return false;
		}
	});
	const [step, setStep] = useState(0);

	function close() {
		try {
			window.localStorage.setItem(storageKey, "seen");
		} catch {
			// The guide still closes for this visit.
		}
		setOpen(false);
	}

	const current = STEPS[step];
	const Icon = current.icon;
	const last = step === STEPS.length - 1;

	return (
		<Sheet
			open={open}
			onClose={close}
			title="A small guide"
			description="Four quiet stops. You can replay this from Help."
			footer={
				<div className="flex items-center justify-between gap-3">
					<Button
						variant="ghost"
						onClick={() => (step === 0 ? close() : setStep((value) => value - 1))}
					>
						{step === 0 ? "Not now" : (
							<>
								<ArrowLeft aria-hidden size={15} />
								Back
							</>
						)}
					</Button>
					<Button
						onClick={() => {
							if (last) close();
							else setStep((value) => value + 1);
						}}
					>
						{last ? "Enter the circle" : "Next"}
						{last ? null : <ArrowRight aria-hidden size={15} />}
					</Button>
				</div>
			}
		>
			<div className="space-y-5">
				<div className="flex items-center gap-3">
					<span className="flex size-11 items-center justify-center rounded-full bg-gold-soft text-gold">
						<Icon aria-hidden size={21} strokeWidth={1.5} />
					</span>
					<p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-soft">
						Step {step + 1} of {STEPS.length}
					</p>
				</div>
				<div>
					<h3 className="font-serif text-2xl leading-tight text-ink">
						{current.title}
					</h3>
					<p className="mt-3 text-sm leading-relaxed text-ink-soft">
						{current.body}
					</p>
				</div>
				<div className="flex gap-1.5" aria-hidden>
					{STEPS.map((item, index) => (
						<span
							key={item.title}
							className={
								index === step
									? "h-1.5 w-6 rounded-full bg-gold"
									: "h-1.5 w-1.5 rounded-full bg-line"
							}
						/>
					))}
				</div>
			</div>
		</Sheet>
	);
}
