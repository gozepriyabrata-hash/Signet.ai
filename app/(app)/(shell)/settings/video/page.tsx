import type { Metadata } from "next";

import { VideoSettings } from "@/components/settings/VideoSettings";

export const metadata: Metadata = { title: "Video" };

export default function VideoSettingsPage() {
  return <VideoSettings />;
}
