import { beforeEach, describe, expect, it } from "vitest";

import { mockClient } from "@/lib/api/mock";
import { resetSettingsStores } from "@/lib/api/mock/settings-store";
import { readProjects, resetProjects } from "@/lib/api/mock/store";

beforeEach(() => {
  window.sessionStorage.clear();
  resetProjects();
  resetSettingsStores();
});

/**
 * specs/008 §3.3. The rule that would otherwise break silently: a preset is
 * archived rather than deleted so that `/campaigns/[id]` — a record of what was
 * already sent to a client — keeps its meaning.
 */
describe("presets · archive, never delete", () => {
  it("has no delete method at all", () => {
    // The absence is the design. If this ever fails, read specs/008 §3.3 before
    // deciding the test is wrong.
    expect("deletePreset" in mockClient).toBe(false);
  });

  it("removes an archived preset from the workflow's view", async () => {
    const [cta] = await mockClient.listPresets("cta");
    await mockClient.archivePreset(cta.id);

    const live = await mockClient.listPresets("cta");
    expect(live.map((preset) => preset.id)).not.toContain(cta.id);
  });

  it("still resolves an archived preset for a package already sent", async () => {
    // The whole point. A sent package references `email.ctaId`; archiving the
    // preset must not make the campaign detail page unable to say what went
    // out.
    const sent = readProjects().find((project) => project.package?.status === "sent");
    const referencedId = sent?.package?.email.ctaId;
    expect(referencedId).toBeDefined();

    await mockClient.archivePreset(referencedId as string);

    const withArchived = await mockClient.listPresets("cta", {
      includeArchived: true,
    });
    const resolved = withArchived.find((preset) => preset.id === referencedId);

    expect(resolved).toBeDefined();
    expect(resolved?.archivedAt).toBeDefined();
  });

  it("restores an archived preset", async () => {
    const [cta] = await mockClient.listPresets("cta");
    await mockClient.archivePreset(cta.id);
    await mockClient.restorePreset(cta.id);

    expect((await mockClient.listPresets("cta")).map((p) => p.id)).toContain(
      cta.id,
    );
  });

  it("hands the default to a live preset when the default is archived", async () => {
    // A kind with presets and no default leaves the workflow's dropdown with
    // nothing to pre-select.
    const before = await mockClient.listPresets("avatar");
    const previousDefault = before.find((preset) => preset.isDefault);
    expect(previousDefault).toBeDefined();

    await mockClient.archivePreset(previousDefault!.id);

    const after = await mockClient.listPresets("avatar");
    expect(after.filter((preset) => preset.isDefault)).toHaveLength(1);
    expect(after.find((preset) => preset.isDefault)?.id).not.toBe(
      previousDefault!.id,
    );
  });
});

describe("presets · defaults are exclusive per kind", () => {
  it("leaves exactly one default after setDefaultPreset", async () => {
    // Two defaults is a silent bug: nothing surfaces it, and a dropdown just
    // pre-selects whichever sorted first.
    const avatars = await mockClient.listPresets("avatar");
    const other = avatars.find((preset) => !preset.isDefault);
    expect(other).toBeDefined();

    await mockClient.setDefaultPreset(other!.id);

    const after = await mockClient.listPresets("avatar");
    expect(after.filter((preset) => preset.isDefault)).toHaveLength(1);
    expect(after.find((preset) => preset.isDefault)?.id).toBe(other!.id);
  });

  it("does not touch another kind's default", async () => {
    const voicesBefore = await mockClient.listPresets("voice");
    const avatars = await mockClient.listPresets("avatar");

    await mockClient.setDefaultPreset(
      avatars.find((preset) => !preset.isDefault)!.id,
    );

    const voicesAfter = await mockClient.listPresets("voice");
    expect(voicesAfter.find((p) => p.isDefault)?.id).toBe(
      voicesBefore.find((p) => p.isDefault)?.id,
    );
  });

  it("refuses to make an archived preset the default", async () => {
    const avatars = await mockClient.listPresets("avatar");
    const spare = avatars.find((preset) => !preset.isDefault)!;
    await mockClient.archivePreset(spare.id);

    await expect(mockClient.setDefaultPreset(spare.id)).rejects.toThrow(
      /Restore it first/,
    );
  });
});

describe("presets · create and update", () => {
  it("creates into the right kind and appears in the workflow's list", async () => {
    const created = await mockClient.createPreset("cta", {
      name: "Reply with a time",
      description: "Invites a direct reply.",
    });

    expect(created.kind).toBe("cta");
    expect((await mockClient.listPresets("cta")).map((p) => p.id)).toContain(
      created.id,
    );
  });

  it("makes the first preset of a kind its default", async () => {
    // A kind with presets and no default is a dropdown with nothing selected.
    const segments = await mockClient.listPresets("segment");
    for (const preset of segments) await mockClient.archivePreset(preset.id);

    const created = await mockClient.createPreset("segment", { name: "First" });
    expect(created.isDefault).toBe(true);
  });

  it("reports a missing preset rather than inventing one", async () => {
    await expect(mockClient.updatePreset("pre_nope", { name: "x" })).rejects.toThrow(
      /No preset with id/,
    );
  });
});

/**
 * specs/008 §3.4 — the one place this spec does not archive. A saved recipient
 * is a person, and "we kept it, just hidden" is the wrong answer to "remove
 * this person".
 */
describe("recipients · a real delete", () => {
  it("removes the record entirely", async () => {
    const before = await mockClient.listRecipients();
    expect(before.length).toBeGreaterThan(0);

    await mockClient.deleteRecipient(before[0].id);

    const after = await mockClient.listRecipients();
    expect(after.map((entry) => entry.id)).not.toContain(before[0].id);
  });

  it("leaves a sent package still able to name its recipient", async () => {
    // History survives because the package holds a COPY, not a reference —
    // which is what makes deleting safe here and archiving necessary for
    // presets.
    const sent = readProjects().find((project) => project.package?.status === "sent");
    const name = sent?.package?.recipient.name;
    const id = sent?.package?.recipient.id;
    expect(name).toBeDefined();

    await mockClient.deleteRecipient(id as string);

    const stillThere = readProjects().find(
      (project) => project.id === sent?.id,
    )?.package?.recipient.name;
    expect(stillThere).toBe(name);
  });

  it("saves a new recipient and updates an existing one", async () => {
    const [first] = await mockClient.listRecipients();
    await mockClient.saveRecipient({ ...first, role: "Chief Executive" });

    const after = await mockClient.listRecipients();
    expect(after.find((entry) => entry.id === first.id)?.role).toBe(
      "Chief Executive",
    );
    expect(after).toHaveLength((await mockClient.listRecipients()).length);
  });
});

describe("settings · the consent gate starts closed", () => {
  it("ships every tracking option off", async () => {
    // specs/008 §3.7. A product whose proposition is that a human approves
    // every send does not open with recipient tracking already enabled.
    const settings = await mockClient.getSettings();

    expect(settings.tracking.opens).toBe(false);
    expect(settings.tracking.clicks).toBe(false);
    expect(settings.tracking.discloseToRecipient).toBe(false);
  });

  it("merges a patch one level deep", async () => {
    // A screen patches `tracking` without having to resend `retention`.
    const before = await mockClient.getSettings();
    const after = await mockClient.updateSettings({
      tracking: { ...before.tracking, opens: true },
    });

    expect(after.tracking.opens).toBe(true);
    expect(after.retention).toEqual(before.retention);
  });
});
