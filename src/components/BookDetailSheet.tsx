import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export interface BookDetail {
  id: string;
  isbn: string | null;
  title: string | null;
  author: string | null;
  publisher: string | null;
  year: string | null;
  quantity: number;
  condition: string | null;
  category: string | null;
  shelf_location: string | null;
  created_at: string;
}

interface Props {
  book: BookDetail | null;
  onClose: () => void;
  onEdit: (book: BookDetail) => void;
}

export function BookDetailSheet({ book, onClose, onEdit }: Props) {
  if (!book) return null;
  
  return (
    <Sheet open={!!book} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[80vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{book.title || 'Untitled'}</SheetTitle>
          <SheetDescription>Added on {new Date(book.created_at).toLocaleDateString()}</SheetDescription>
        </SheetHeader>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Detail label="ISBN"        value={book.isbn} />
          <Detail label="Author"      value={book.author} />
          <Detail label="Publisher"   value={book.publisher} />
          <Detail label="Year"        value={book.year} />
          <Detail label="Quantity"    value={book.quantity} />
          <Detail label="Condition"   value={book.condition} />
          <Detail label="Category"    value={book.category} />
          <div className="col-span-2 mt-2">
            <Detail label="Shelf Location" value={book.shelf_location} />
          </div>
        </dl>
        <Button className="mt-6 w-full" onClick={() => onEdit(book)}>
          Edit Book
        </Button>
      </SheetContent>
    </Sheet>
  );
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd>{value || <span className="text-slate-300">—</span>}</dd>
    </div>
  );
}
