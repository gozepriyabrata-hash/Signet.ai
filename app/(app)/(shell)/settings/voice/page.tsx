import type { Metadata } from "next";

import { VoiceSettings } from "@/components/settings/VoiceSettings";

export const metadata: Metadata = { title: "Voice" };

export default function VoiceSettingsPage() {
  return <VoiceSettings />;
}
