"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { WorkspaceSettings } from "@/types";

/**
 * The workspace document behind `/settings/analytics` and `/settings/security`.
 *
 * One record, two screens. Patches merge one level deep on the adapter's side,
 * so Analytics can change `tracking` without resending `retention` — two
 * screens editing one document must not be able to overwrite each other's half.
 */
export function useSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: qk.settings(),
    queryFn: () => api.getSettings(),
  });

  const update = useMutation({
    mutationFn: (patch: Partial<WorkspaceSettings>) => api.updateSettings(patch),
    onSuccess: (next) => {
      // Write the server's answer straight into the cache rather than
      // invalidating: a toggle that flickers back to its old value while a
      // refetch lands reads as the switch having failed.
      queryClient.setQueryData(qk.settings(), next);
    },
  });

  return { settings: query.data, ...query, update };
}

export function useUsage() {
  return useQuery({ queryKey: qk.usage(), queryFn: () => api.getUsage() });
}
