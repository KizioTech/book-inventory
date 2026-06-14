import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookFormValues, enqueue } from "@/lib/bookQueue";

interface Props {
  data: BookFormValues | null;
  onResolved: () => void;
}

export function RecoveryDialog({ data, onResolved }: Props) {
  const [retrying, setRetrying] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  if (!data) return null;

  const retry = async () => {
    setRetrying(true);
    const { error } = await supabase.from("books").insert(data);
    setRetrying(false);

    if (error) {
      if (error.message.includes('fetch')) {
         toast.info("Offline — adding to queue.");
         enqueue(data);
         onResolved();
      } else {
         toast.error("Still failing — " + error.message);
      }
      return;
    }
    toast.success(`Saved "${data.title}" ✓`);
    onResolved();
  };

  return (
    <Dialog open={!!data} onOpenChange={(o) => { if(!o && !confirmDiscard) setConfirmDiscard(true); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600">⚠ Save Failed</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-600">
          The following record could not be saved. Retry or cancel to discard it.
        </p>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-slate-50 p-4 text-sm max-h-[300px] overflow-y-auto">
          {Object.entries(data).map(([k, v]) =>
            v ? (
              <div key={k} className="col-span-2 sm:col-span-1">
                <dt className="font-medium text-slate-500 capitalize">{k.replace('_', ' ')}</dt>
                <dd className="break-words">{String(v)}</dd>
              </div>
            ) : null
          )}
        </dl>

        {confirmDiscard ? (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
            This record will be permanently lost. Are you sure?
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="destructive" onClick={onResolved}>
                Yes, discard
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmDiscard(false)}>
                Keep it
              </Button>
            </div>
          </div>
        ) : (
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDiscard(true)}>
              Cancel record
            </Button>
            <Button onClick={retry} disabled={retrying}>
              {retrying ? "Retrying…" : "Retry save"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
