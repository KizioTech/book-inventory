import { useState } from "react";
import { AlertTriangle } from "lucide-react";
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
    toast.success(`Saved "${data.title}"`);
    onResolved();
  };

  return (
    <Dialog open={!!data} onOpenChange={(o) => { if(!o && !confirmDiscard) setConfirmDiscard(true); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Save failed
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          The following record could not be saved. Retry or cancel to discard it.
        </p>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-md bg-secondary p-4 text-sm max-h-[300px] overflow-y-auto">
          {Object.entries(data).map(([k, v]) =>
            v ? (
              <div key={k} className="col-span-2 sm:col-span-1">
                <dt className="text-eyebrow">{k.replace('_', ' ')}</dt>
                <dd className="wrap-break-words text-foreground">{String(v)}</dd>
              </div>
            ) : null
          )}
        </dl>

        {confirmDiscard ? (
          <div className="rounded-md border border-accent/25 bg-accent/[0.06] p-3 text-sm text-foreground">
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