import type { Metadata } from "next";

import { RecipientsSettings } from "@/components/settings/RecipientsSettings";

export const metadata: Metadata = { title: "Recipients" };

export default function RecipientsSettingsPage() {
  return <RecipientsSettings />;
}
