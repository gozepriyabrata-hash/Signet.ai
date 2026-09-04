import type { Metadata } from "next";

import { AvatarSettings } from "@/components/settings/AvatarSettings";

export const metadata: Metadata = { title: "Avatar" };

/**
 * The first real settings section, and the one the other eight are measured
 * against: if `PresetList` is the right shape, five more sections are a route
 * and a few strings (specs/008 §3.1).
 */
export default function AvatarSettingsPage() {
  return <AvatarSettings />;
}
