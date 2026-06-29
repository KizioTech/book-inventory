import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type BooksInsert = Database["public"]["Tables"]["books"]["Insert"];

export interface BookFormValues {
  id: string; // client-generated UUID
  isbn: string | null;
  title: string | null;
  author: string | null;
  author_2: string | null;
  author_3: string | null;
  author_4: string | null;
  author_5: string | null;
  publisher: string | null;
  year: string | null;
  quantity: number;
  condition: string | null;
  category: string | null;
  shelf_location: string | null;
  school_id: string;
  clerk_id: string;
  flagged_as_duplicate?: boolean;
}

const QUEUE_KEY = "pendingBooks";

export function enqueue(book: BookFormValues) {
  const queue: BookFormValues[] = JSON.parse(
    localStorage.getItem(QUEUE_KEY) ?? "[]"
  );
  queue.push(book);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function dequeue(): BookFormValues[] {
  const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  localStorage.removeItem(QUEUE_KEY);
  return queue;
}

// BUG 3 FIX: Collect all failures, re-queue them, then call onError once.
export async function flushQueue(onError: (b: BookFormValues) => void) {
  const items = dequeue();
  if (items.length === 0) return;

  const failed: BookFormValues[] = [];

  for (const book of items) {
    const { error } = await supabase
      .from("books")
      .upsert(book as unknown as BooksInsert, { onConflict: "id" });
    if (error) {
      failed.push(book);
    }
  }

  if (failed.length > 0) {
    // Re-queue all failed items first, then surface the first one to the user.
    localStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
    onError(failed[0]);
  }
}

// Module-level map to track pending toast states
const pending = new Map<string, { values: BookFormValues; toastId: string | number }>();

// BUG 2 FIX: Use navigator.onLine and catch TypeError for robust offline detection.
function isNetworkError(err: unknown): boolean {
  if (!navigator.onLine) return true;
  if (err instanceof TypeError) return true;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("fetch") ||
      msg.includes("network") ||
      msg.includes("failed to load") ||
      msg.includes("networkerror")
    );
  }
  return false;
}

// BUG 1 FIX: Accept an onDone callback so the caller can clear saving state
// only when the operation actually completes (success or failure).
export async function saveBookInBackground(
  values: BookFormValues,
  onError: (values: BookFormValues) => void,
  onUndo: (id: string) => void,
  onDone?: () => void,
) {
  const toastId = toast.loading(`Saving "${values.title || "Untitled"}"…`);
  pending.set(values.id, { values, toastId });

  try {
    const { error } = await supabase
      .from("books")
      .insert(values as unknown as BooksInsert);
    if (error) throw error;

    toast.success(`Saved "${values.title || "Untitled"}" ✓`, {
      id: toastId,
      duration: 10_000,
      action: {
        label: "Undo",
        onClick: async () => {
          await supabase.from("books").delete().eq("id", values.id);
          toast.info("Book removed.");
          onUndo(values.id);
        },
      },
    });
    pending.delete(values.id);
  } catch (err) {
    toast.dismiss(toastId);
    pending.delete(values.id);

    if (isNetworkError(err)) {
      // Network error → offline queue
      enqueue(values);
      toast.info(`Offline: "${values.title || "Untitled"}" queued for sync.`);
    } else {
      // Other DB error → show recovery dialog
      onError(values);
    }
  } finally {
    // Always unblock the save button once the operation resolves.
    onDone?.();
  }
}
