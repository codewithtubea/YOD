type ExportRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ExportRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function list(value: unknown): ExportRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function heading(value: string) {
  return `## ${value}\n`;
}

export function exportToMarkdown(data: unknown): string {
  if (!isRecord(data)) return "# YOD Circle export\n\nNo data was returned.\n";

  const profile = isRecord(data.profile) ? data.profile : {};
  const settings = isRecord(data.settings) ? data.settings : {};
  const posts = list(data.posts);
  const replies = list(data.replies);
  const prayers = list(data.prayers);
  const updates = list(data.prayer_updates);
  const checkIns = list(data.check_ins);
  const encouragementsSent = list(data.encouragements_sent);
  const encouragementsReceived = list(data.encouragements_received);
  const saved = list(data.saved_affirmations);
  const concerns = list(data.contact_messages);
  const exportedAt = text(data.exported_at, new Date().toISOString());

  const sections: string[] = [
    "# YOD Circle export\n",
    `Exported ${exportedAt}\n`,
    heading("Profile"),
    `- Name: ${text(profile.display_name, "—")}`,
    `- Email: ${text(profile.email, "—")}`,
    `- Bio: ${text(profile.bio, "—")}`,
    `- Joined: ${text(profile.joined_at, "—")}\n`,
    heading("Display settings"),
    `- Theme: ${text(settings.theme, "system")}`,
    `- Reduce motion: ${settings.reduce_motion ? "on" : "off"}`,
    `- Text size: ${text(settings.text_size, "default")}`,
    `- Reply notices: ${settings.notify_replies === false ? "off" : "on"}`,
    `- Amen notices: ${settings.notify_amens === false ? "off" : "on"}`,
    `- Answered notices: ${settings.notify_answered === false ? "off" : "on"}`,
    `- Encouragement notices: ${settings.notify_encouragements === false ? "off" : "on"}\n`,
    heading("Reflections"),
  ];

  if (posts.length === 0) {
    sections.push("No reflections.\n");
  } else {
    for (const post of posts) {
      sections.push(
        `### ${text(post.plan_date, "Reading")} · ${text(post.kind, "thought")}\n`,
        `${text(post.body, "—")}\n`,
        `_${text(post.created_at, "Unknown date")}_\n`,
      );
    }
  }

  sections.push(heading("Replies"));
  if (replies.length === 0) {
    sections.push("No replies.\n");
  } else {
    for (const reply of replies) {
      sections.push(
        `${text(reply.body, "—")}\n`,
        `_${text(reply.created_at, "Unknown date")}_\n`,
      );
    }
  }

  sections.push(heading("Prayers"));
  if (prayers.length === 0) {
    sections.push("No prayers.\n");
  } else {
    for (const prayer of prayers) {
      sections.push(
        `${text(prayer.body, "—")}\n`,
        `_${text(prayer.status, "open")} · ${text(prayer.created_at, "Unknown date")}_\n`,
      );
    }
  }

  sections.push(heading("Prayer updates"));
  if (updates.length === 0) {
    sections.push("No prayer updates.\n");
  } else {
    for (const update of updates) {
      sections.push(
        `${text(update.body, "—")}\n`,
        `_${text(update.created_at, "Unknown date")}_\n`,
      );
    }
  }

  sections.push(heading("Weekly check-ins"));
  if (checkIns.length === 0) {
    sections.push("No check-ins.\n");
  } else {
    for (const checkIn of checkIns) {
      sections.push(
        `### Week of ${text(checkIn.week_start, "—")} · ${text(checkIn.mood, "—")}\n`,
        `${text(checkIn.note, "No note.")}\n`,
        `_${text(checkIn.created_at, "Unknown date")}_\n`,
      );
    }
  }

  sections.push(heading("Encouragement notes sent"));
  if (encouragementsSent.length === 0) {
    sections.push("No notes sent.\n");
  } else {
    for (const note of encouragementsSent) {
      sections.push(
        `${text(note.body, "—")}\n`,
        `_To ${text(note.to_user_id, "a member")} · ${text(note.created_at, "Unknown date")}_\n`,
      );
    }
  }

  sections.push(heading("Encouragement notes received"));
  if (encouragementsReceived.length === 0) {
    sections.push("No notes received.\n");
  } else {
    for (const note of encouragementsReceived) {
      sections.push(
        `${text(note.body, "—")}\n`,
        `_From ${text(note.from_user_id, "a member")} · ${text(note.created_at, "Unknown date")}_\n`,
      );
    }
  }

  sections.push(heading("Saved affirmations"));
  sections.push(
    saved.length === 0
      ? "No saved affirmations.\n"
      : `${saved.length} saved affirmation(s). The JSON file has their ids.\n`,
  );

  sections.push(heading("Messages to admins"));
  if (concerns.length === 0) {
    sections.push("No messages.\n");
  } else {
    for (const concern of concerns) {
      sections.push(
        `### ${text(concern.subject, "Concern")}\n`,
        `${text(concern.body, "—")}\n`,
        `_${text(concern.status, "new")} · ${text(concern.created_at, "Unknown date")}_\n`,
      );
    }
  }

  sections.push(
    "\n---\n",
    "Private prayer authorship, Amens, reading marks, check-ins, encouragement notes, and contact messages are included in the JSON file. They are not shared with other members.\n",
  );

  return sections.join("\n");
}
