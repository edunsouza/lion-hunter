import { Context } from 'hono';

export const notify = (c: Context, message: string) => {
  if (!message) {
    return;
  }

  return fetch(`https://ntfy.sh/${c.env.NTFY_TOPIC}`, {
    method: 'POST',
    body: message
  })
}
