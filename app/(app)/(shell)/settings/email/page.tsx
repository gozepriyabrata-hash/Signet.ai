import type { Metadata } from "next";

import { EmailSettings } from "@/components/settings/EmailSettings";

export const metadata: Metadata = { title: "Email" };

export default function EmailSettingsPage() {
  return <EmailSettings />;
}
