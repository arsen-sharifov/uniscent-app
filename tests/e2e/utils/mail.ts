import type { IE2EMailboxSearch, IE2EMailMessage } from '../interfaces';
import { getMailpitUrl } from './env';

const POLL_ATTEMPTS = 20;

const POLL_INTERVAL_MS = 500;

const VERIFY_LINK_PATTERN = /https?:\/\/\S+\/auth\/v1\/verify\S+/;

const JOIN_LINK_PATTERN = /https?:\/\/\S+\/join\?token_hash=\S+/;

const wait = (durationMs: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, durationMs));

const readJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${getMailpitUrl()}${path}`);

  if (!response.ok) throw new Error(`Mailpit request ${path} failed with ${response.status}`);

  return (await response.json()) as T;
};

const findNewestMessageId = async (email: string): Promise<string | null> => {
  const query = encodeURIComponent(`to:${email}`);
  const mailbox = await readJson<IE2EMailboxSearch>(`/api/v1/search?query=${query}`);

  return mailbox.messages[0]?.ID ?? null;
};

const readEmailLink = async (email: string, pattern: RegExp, attempt = 0): Promise<string> => {
  const messageId = await findNewestMessageId(email);

  if (!messageId) {
    if (attempt >= POLL_ATTEMPTS) throw new Error(`No email arrived for ${email}`);

    await wait(POLL_INTERVAL_MS);

    return readEmailLink(email, pattern, attempt + 1);
  }

  const message = await readJson<IE2EMailMessage>(`/api/v1/message/${messageId}`);
  const link = message.Text.match(pattern)?.[0];

  if (!link) throw new Error(`The email to ${email} carries no link matching ${pattern}`);

  return link;
};

export const readConfirmationLink = (email: string): Promise<string> => readEmailLink(email, VERIFY_LINK_PATTERN);

export const readInviteLink = (email: string): Promise<string> => readEmailLink(email, JOIN_LINK_PATTERN);
