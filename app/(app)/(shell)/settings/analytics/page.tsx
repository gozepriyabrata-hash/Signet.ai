import type { Metadata } from "next";

import { AnalyticsSettings } from "@/components/settings/AnalyticsSettings";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsSettingsPage() {
  return <AnalyticsSettings />;
}
