"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { PresetInput } from "@/lib/api/types";
import { qk } from "@/lib/query-keys";
import type { PresetKind } from "@/types";

/**
 * One settings section's presets, and every mutation that acts on them.
 *
 * ── `includeArchived: true`, deliberately ───────────────────────────────────
 * This is the ONE caller that asks for archived rows. The workflow's dropdowns
 * call `listPresets(kind)` with no options and get only live presets, which is
 * what keeps an archived avatar out of the Video step without VideoStep knowing
 * archiving exists (specs/008 §3.4). Settings is the place archived presets are
 * visible, because it is the place they can be restored.
 *
 * ── Why every mutation invalidates two keys ─────────────────────────────────
 * A mutation here changes what the workflow will offer. Invalidating both the
 * archived-inclusive key this hook reads AND the live-only key the dropdowns
 * read is what makes a preset created in Settings appear in a Video step that
 * is already open in another tab.
 */
export function usePresets(kind: PresetKind) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: qk.presets(kind, true) });
    void queryClient.invalidateQueries({ queryKey: qk.presets(kind) });
  };

  const query = useQuery({
    queryKey: qk.presets(kind, true),
    queryFn: () => api.listPresets(kind, { includeArchived: true }),
  });

  const create = useMutation({
    mutationFn: (input: PresetInput) => api.createPreset(kind, input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<PresetInput> }) =>
      api.updatePreset(id, input),
    onSuccess: invalidate,
  });

  const archive = useMutation({
    mutationFn: (id: string) => api.archivePreset(id),
    onSuccess: invalidate,
  });

  const restore = useMutation({
    mutationFn: (id: string) => api.restorePreset(id),
    onSuccess: invalidate,
  });

  const setDefault = useMutation({
    mutationFn: (id: string) => api.setDefaultPreset(id),
    onSuccess: invalidate,
  });

  return {
    presets: query.data,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    create,
    update,
    archive,
    restore,
    setDefault,
  };
}
