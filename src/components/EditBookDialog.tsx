import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { BookDetail } from "./BookDetailSheet";

const BOOK_CATEGORIES = [
  "Arts",
  "History",
  "Fiction",
  "Non-Fiction",
  "Mathematics",
  "Literature",
  "Science",
  "Technology",
] as const;

interface Props {
  book: BookDetail | null;
  onClose: () => void;
  onSaved: (book: BookDetail) => void;
}

export function EditBookDialog({ book, onClose, onSaved }: Props) {
  const [form, setForm] = useState<Partial<BookDetail>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (book) {
      setForm({ ...book });
    }
  }, [book]);

  if (!book) return null;

  const save = async () => {
    const titleVal = form.title?.trim() || "";
    const authorVal = form.author?.trim() || "";

    if (!titleVal) {
      toast.error("Title is required.");
      return;
    }
    if (!authorVal) {
      toast.error("Author is required.");
      return;
    }
    const yearVal = form.year?.trim() || "";
    if (yearVal) {
      const y = parseInt(yearVal);
      const current = new Date().getFullYear();
      if (isNaN(y) || y < 1450 || y > current) {
        toast.error(`Year must be between 1450 and ${current}.`);
        return;
      }
    }

    setSaving(true);
    const updatedFields = {
      isbn: form.isbn?.trim() || null,
      title: titleVal || null,
      author: authorVal || null,
      publisher: form.publisher?.trim() || null,
      year: yearVal || null,
      quantity: Math.max(1, Number(form.quantity) || 1),
      condition: form.condition,
      category: form.category?.trim() || null,
      shelf_location: form.shelf_location?.trim() || null,
    };

    const { error } = await supabase
      .from("books")
      .update(updatedFields)
      .eq("id", book.id);
      
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Book updated");
    onSaved({ ...book, ...updatedFields } as BookDetail);
    onClose();
  };

  return (
    <Dialog open={!!book} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit book</DialogTitle>
          <DialogDescription>Update the details for this book.</DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2 space-y-1.5">
            <Label>ISBN</Label>
            <Input
              value={form.isbn || ""}
              onChange={(e) => setForm({ ...form, isbn: e.target.value })}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Title</Label>
            <Input
              value={form.title || ""}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Author(s)</Label>
            <Input
              value={form.author || ""}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Publisher</Label>
            <Input
              value={form.publisher || ""}
              onChange={(e) => setForm({ ...form, publisher: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Year</Label>
            <Input
              value={form.year || ""}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <Input
              type="number"
              min={1}
              value={form.quantity === undefined ? "" : form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value === "" ? ("" as unknown as number) : Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Condition</Label>
            <Select
              value={form.condition || ""}
              onValueChange={(v) => setForm({ ...form, condition: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Good">Good</SelectItem>
                <SelectItem value="Fair">Fair</SelectItem>
                <SelectItem value="Poor">Poor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={form.category || ""}
              onValueChange={(v) => setForm({ ...form, category: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {BOOK_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Shelf location</Label>
            <Input
              value={form.shelf_location || ""}
              onChange={(e) => setForm({ ...form, shelf_location: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}