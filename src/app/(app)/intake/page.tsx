import { headers } from "next/headers";
import { IntakePageClient } from "@/components/IntakePageClient";
import { getSession } from "@/lib/auth";
import {
  intakeWebhookSecret,
  outlookConfigured,
  serviceChannelConfigured,
} from "@/lib/integrations/config";

export default async function IntakePage() {
  const session = await getSession();
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return (
    <IntakePageClient
      serviceChannel={serviceChannelConfigured()}
      outlook={outlookConfigured()}
      webhookSecret={intakeWebhookSecret()}
      origin={`${proto}://${host}`}
      isAdmin={session?.isAdmin ?? false}
    />
  );
}
