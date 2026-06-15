import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BookFormValues {
  id: string; // client-generated UUID
  isbn: string | null;
  title: string | null;
  author: string | null;
  publisher: string | null;
  year: string | null;
  quantity: number;
  condition: string | null;
  notes: string | null;
  school_id: string;
  clerk_id: string;
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

export async function flushQueue(onError: (b: BookFormValues) => void) {
  const items = dequeue();
  const failed: BookFormValues[] = [];
  
  for (const book of items) {
    const { error } = await supabase.from("books").upsert(book, { onConflict: 'id' });
    if (error) {
      failed.push(book); // Re-queue only failed items
      onError(book);
    }
  }
  
  if (failed.length > 0) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
  }
}

// Module-level map to track pending toast states
const pending = new Map<string, { values: BookFormValues; toastId: string | number }>();

export async function saveBookInBackground(
  values: BookFormValues,
  onError: (values: BookFormValues) => void,
  onUndo: (id: string) => void
) {
  const toastId = toast.loading(`Saving "${values.title || 'Untitled'}"…`);
  pending.set(values.id, { values, toastId });

  try {
    const { error } = await supabase.from("books").insert(values);
    if (error) throw error;

    toast.success(`Saved "${values.title || 'Untitled'}" ✓`, { 
      id: toastId,
      duration: 10_000,
      action: {
        label: "Undo",
        onClick: async () => {
          // Attempt to delete it from DB
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
    
    if (err instanceof Error && err.message.includes('fetch')) {
      // Network error -> offline queue
      enqueue(values);
      toast.info(`Offline: "${values.title || 'Untitled'}" queued for sync.`);
    } else {
      // Other error -> show recovery dialog
      onError(values);
    }
  }
}
