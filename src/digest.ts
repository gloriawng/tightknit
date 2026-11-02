import type { Digest, SlackMessage } from "./types";

/**
 * Build the weekly digest for one Slack channel.
 *
 * The week starts at `weekStart` and runs for 7 days.
 *
 * Returns:
 *  - topThreads: the 3 most active threads this week
 *  - unanswered: questions posted this week that nobody has answered
 */
export function buildDigest(messages: SlackMessage[], weekStart: Date): Digest {
  const weekStartSeconds = weekStart.getTime() / 1000;
  const weekEndSeconds = weekStartSeconds + 7 * 24 * 60 * 60;
  const thisWeek = messages.filter((message) => {
    const timestamp = Number(message.ts);
    return timestamp >= weekStartSeconds && timestamp < weekEndSeconds;
  });
  const repliesByThread = new Map<string, number>();

  for (const message of thisWeek) {
    if (message.thread_ts && message.thread_ts !== message.ts) {
      repliesByThread.set(
        message.thread_ts,
        (repliesByThread.get(message.thread_ts) ?? 0) + 1,
      );
    }
  }

  const topThreads = thisWeek
    .filter(
      (message) =>
        message.reply_count !== undefined && message.reply_count > 0,
    )
    .map((message) => {
      const thread_ts = message.thread_ts ?? message.ts;
      return {
        thread_ts,
        text: message.text,
        repliesThisWeek: repliesByThread.get(thread_ts) ?? 0,
      };
    })
    .filter((thread) => thread.repliesThisWeek > 0)
    .sort((a, b) => b.repliesThisWeek - a.repliesThisWeek)
    .slice(0, 3);

  const unanswered = thisWeek
    .filter(
      (message) =>
        message.text.includes("?") && message.reply_count === undefined,
    )
    .map(({ ts, user, text }) => ({ ts, user, text }));

  return { topThreads, unanswered };
}
