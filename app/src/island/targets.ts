// La flecha ↗ de la isla: abre lo que señala la pestaña enfocada.

import { Bridge } from "../core/bridge";
import { SPOTIFY_ID } from "../core/spotify";
import type { AgentTask } from "../core/state";

const CLAUDE_DESKTOP_ID = "agent_claude-desktop";

const URLS: Record<string, string> = {
  integration_resend: "https://resend.com/emails",
  integration_vercel: "https://vercel.com/dashboard",
  integration_github: "https://github.com/pulls",
  integration_stripe: "https://dashboard.stripe.com/payments",
  integration_notion: "https://notion.so",
  integration_calcom: "https://app.cal.com/bookings",
  // WhatsApp Web, en el navegador.
  integration_whatsapp: "https://web.whatsapp.com",
};

export function openTarget(task: Pick<AgentTask, "id" | "sessionId" | "sessionCwd"> | null) {
  if (!task) return;
  if (task.sessionId) void Bridge.openSession(task.sessionId, task.sessionCwd ?? null);
  // Sin sesión, Claude Code lleva a la app de Claude, donde se usa (nunca a un editor).
  else if (task.id === CLAUDE_DESKTOP_ID || task.id === "integration_claude") void Bridge.openClaudeDesktop();
  else if (task.id === "integration_n8n") void Bridge.openN8n();
  else if (task.id === "integration_gitea") void Bridge.openGitea();
  else if (task.id === SPOTIFY_ID) void Bridge.spotifyOpen();
  else if (URLS[task.id]) void Bridge.openUrl(URLS[task.id]);
}
