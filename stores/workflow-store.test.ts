import { beforeEach, describe, expect, it } from "vitest";

import {
  WORKFLOW_STORAGE_KEY,
  useWorkflowStore,
} from "@/stores/workflow-store";

beforeEach(() => {
  useWorkflowStore.setState({ drafts: {} });
  window.sessionStorage.clear();
  window.localStorage.clear();
});

/**
 * specs/007 §3.4. The draft slice is what makes moving backwards through the
 * workflow lossless, and it is why nothing blocks navigation — a guard that
 * catches `Link` clicks but not the Back button teaches a user their work is
 * safe and then loses it.
 */
describe("workflow-store", () => {
  it("keeps drafts separate per project", () => {
    // Two projects open in two tabs must not overwrite each other's work.
    const { patchDraft, getDraft } = useWorkflowStore.getState();

    patchDraft("prj_a", { subject: "Alpha subject" });
    patchDraft("prj_b", { subject: "Beta subject" });

    expect(getDraft("prj_a").subject).toBe("Alpha subject");
    expect(getDraft("prj_b").subject).toBe("Beta subject");
  });

  it("merges a patch rather than replacing the draft", () => {
    // A step should only have to send what it changed; anything else means the
    // Email step can wipe what the Analysis step wrote.
    const { patchDraft, getDraft } = useWorkflowStore.getState();

    patchDraft("prj_a", { subject: "S" });
    patchDraft("prj_a", { body: "B" });

    expect(getDraft("prj_a")).toEqual({ subject: "S", body: "B" });
  });

  it("returns an empty draft for a project it has never seen", () => {
    expect(useWorkflowStore.getState().getDraft("prj_unknown")).toEqual({});
  });

  it("clears one project's draft without touching another's", () => {
    const { patchDraft, clearDraft, getDraft } = useWorkflowStore.getState();

    patchDraft("prj_a", { subject: "A" });
    patchDraft("prj_b", { subject: "B" });
    clearDraft("prj_a");

    expect(getDraft("prj_a")).toEqual({});
    expect(getDraft("prj_b").subject).toBe("B");
  });

  it("survives a reload, which is what makes back-navigation lossless", async () => {
    useWorkflowStore.getState().patchDraft("prj_a", {
      recipient: { name: "Ada Speke", company: "Wexley" },
    });

    // Capture what a reload would actually find. This has to be read BEFORE
    // resetting the in-memory state: the persist middleware writes through on
    // every set, so clearing the store also clears storage — which is the
    // difference between simulating a reload and simulating a wipe.
    const persisted = window.localStorage.getItem(WORKFLOW_STORAGE_KEY);
    expect(persisted).toContain("Ada Speke");

    useWorkflowStore.setState({ drafts: {} });
    window.localStorage.setItem(WORKFLOW_STORAGE_KEY, persisted as string);
    await useWorkflowStore.persist.rehydrate();

    expect(useWorkflowStore.getState().getDraft("prj_a").recipient).toEqual({
      name: "Ada Speke",
      company: "Wexley",
    });
  });

  it("does not rehydrate on import", () => {
    // skipHydration is set for the same reason as ui-store: rehydrating during
    // module evaluation races React and produces a server/client mismatch.
    expect(useWorkflowStore.persist.getOptions().skipHydration).toBe(true);
  });
});
