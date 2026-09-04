"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { Recipient } from "@/types";

/**
 * The saved-recipient store.
 *
 * `docs/screens.md`'s Recipient step has promised a "Load from saved recipient"
 * control against this since before it existed; specs/008 §3.4 created it.
 *
 * `deleteRecipient` is a REAL delete, and it is the one place specs/008 does
 * not archive. A saved recipient is a person, and "we kept it, just hidden" is
 * the wrong answer to "remove this person". History survives because a sent
 * package holds its own copy of the recipient rather than a reference.
 */
export function useRecipients() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: qk.recipients() });

  const query = useQuery({
    queryKey: qk.recipients(),
    queryFn: () => api.listRecipients(),
  });

  const save = useMutation({
    mutationFn: (input: Recipient) => api.saveRecipient(input),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteRecipient(id),
    onSuccess: invalidate,
  });

  return { recipients: query.data, ...query, save, remove };
}
