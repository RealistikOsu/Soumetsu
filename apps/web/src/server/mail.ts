import { config } from './config';

// BREVO_FROM looks like: "RealistikOsu" <noreply@ussr.pl>
function sender() {
  const match = config.brevoFrom.match(/^"?(.*?)"?\s*<(.+)>$/);
  return match
    ? { name: match[1], email: match[2] }
    : { name: 'RealistikOsu', email: config.brevoFrom };
}

export async function sendMail(to: string, subject: string, html: string) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': config.brevoApiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender: sender(), to: [{ email: to }], subject, htmlContent: html })
  });
  if (!response.ok) throw new Error(`Brevo returned ${response.status}`);
}
