import "server-only";

export function serviceChannelConfigured(): boolean {
  return Boolean(
    process.env.SERVICECHANNEL_USERNAME &&
      process.env.SERVICECHANNEL_PASSWORD &&
      process.env.SERVICECHANNEL_CLIENT_ID &&
      process.env.SERVICECHANNEL_CLIENT_SECRET
  );
}

export function outlookConfigured(): boolean {
  return Boolean(
    process.env.OUTLOOK_TENANT_ID &&
      process.env.OUTLOOK_CLIENT_ID &&
      process.env.OUTLOOK_CLIENT_SECRET &&
      process.env.OUTLOOK_MAILBOX
  );
}

export function intakeWebhookSecret(): string {
  return (
    process.env.INTAKE_WEBHOOK_SECRET ||
    process.env.SHARE_TOKEN_SECRET ||
    `mtc-${(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "local-dev").slice(-24)}`
  );
}

export function serviceChannelEnv() {
  const sandbox = process.env.SERVICECHANNEL_SANDBOX === "1";
  return {
    username: process.env.SERVICECHANNEL_USERNAME ?? "",
    password: process.env.SERVICECHANNEL_PASSWORD ?? "",
    clientId: process.env.SERVICECHANNEL_CLIENT_ID ?? "",
    clientSecret: process.env.SERVICECHANNEL_CLIENT_SECRET ?? "",
    loginUrl: sandbox
      ? "https://sb2login.servicechannel.com/oauth/token"
      : "https://login.servicechannel.com/oauth/token",
    apiUrl: sandbox
      ? "https://sb2api.servicechannel.com"
      : "https://api.servicechannel.com",
  };
}

export function outlookEnv() {
  return {
    tenantId: process.env.OUTLOOK_TENANT_ID ?? "",
    clientId: process.env.OUTLOOK_CLIENT_ID ?? "",
    clientSecret: process.env.OUTLOOK_CLIENT_SECRET ?? "",
    mailbox: process.env.OUTLOOK_MAILBOX ?? "",
  };
}

export function cronAuthorized(request: Request): boolean {
  if (request.headers.get("x-vercel-cron") === "1") return true;
  const secret = process.env.CRON_SECRET ?? intakeWebhookSecret();
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  return Boolean(bearer && bearer === secret);
}

export function webhookAuthorized(request: Request): boolean {
  const secret = intakeWebhookSecret();
  const header =
    request.headers.get("x-mtc-intake") ??
    request.headers.get("x-webhook-secret") ??
    "";
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return header === secret || bearer === secret;
}
