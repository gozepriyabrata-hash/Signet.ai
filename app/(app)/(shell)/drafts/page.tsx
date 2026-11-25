import type { Metadata } from "next";
import { Suspense } from "react";

import { SavedDraftsView } from "@/components/drafts/SavedDraftsView";

export const metadata: Metadata = {
  title: "Saved Drafts — SIGNET AI",
  description: "Manage, resume, or delete your unpublished work.",
};

export default function DraftsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#07090e] p-8">
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="h-8 w-48 bg-white/5 rounded-md animate-pulse" />
            <div className="h-28 bg-white/5 rounded-2xl animate-pulse" />
          </div>
        </div>
      }
    >
      <SavedDraftsView />
    </Suspense>
  );
}
