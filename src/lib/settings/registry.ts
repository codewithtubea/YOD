export type SettingsSectionId = "appearance" | "notifications" | "account";

export type SettingsSection = {
  id: SettingsSectionId;
  title: string;
  description: string;
};

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "appearance",
    title: "Appearance",
    description:
      "Make the circle comfortable to read. These choices follow your account.",
  },
  {
    id: "notifications",
    title: "Notifications",
    description:
      "Choose which in-app notices appear in your bell. There are no email digests.",
  },
  {
    id: "account",
    title: "Account",
    description:
      "Your profile, password, data, and the way you leave the circle.",
  },
];

export type AppearanceSettingKey = "theme" | "reduceMotion" | "textSize";

export type AppearanceSetting = {
  key: AppearanceSettingKey;
  label: string;
  description: string;
  control: "segmented" | "switch";
  options?: { id: string; label: string }[];
};

export const APPEARANCE_SETTINGS: AppearanceSetting[] = [
  {
    key: "theme",
    label: "Theme",
    description: "Follow your device or choose light or dark.",
    control: "segmented",
    options: [
      { id: "light", label: "Light" },
      { id: "system", label: "System" },
      { id: "dark", label: "Dark" },
    ],
  },
  {
    key: "reduceMotion",
    label: "Reduce motion",
    description: "Ambient light rests. All content remains.",
    control: "switch",
  },
  {
    key: "textSize",
    label: "Text size",
    description: "Use a larger base size across the circle.",
    control: "segmented",
    options: [
      { id: "default", label: "Default" },
      { id: "large", label: "Larger" },
    ],
  },
];

export type NotificationSettingKey =
  | "notifyReplies"
  | "notifyAmens"
  | "notifyAnswered"
  | "notifyEncouragements";

export type NotificationSetting = {
  key: NotificationSettingKey;
  label: string;
  description: string;
};

export const NOTIFICATION_SETTINGS: NotificationSetting[] = [
  {
    key: "notifyReplies",
    label: "Replies",
    description: "Someone replies to a thought or question you shared.",
  },
  {
    key: "notifyAmens",
    label: "Amens",
    description: "Someone says Amen to something you shared.",
  },
  {
    key: "notifyAnswered",
    label: "Answered questions",
    description: "A question you asked or answered is marked answered.",
  },
  {
    key: "notifyEncouragements",
    label: "Encouragements",
    description: "Someone sends you a private word of encouragement.",
  },
];
