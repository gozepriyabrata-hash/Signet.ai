import type { Metadata } from "next";

import { AiSettings } from "@/components/settings/AiSettings";

export const metadata: Metadata = { title: "AI" };

export default function AiSettingsPage() {
  return <AiSettings />;
}
