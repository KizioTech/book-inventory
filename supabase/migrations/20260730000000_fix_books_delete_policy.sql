drop policy if exists "books_delete" on public.books;
create policy "books_delete" on public.books for delete
  to authenticated using (
    public.is_staff(auth.uid())
    or (clerk_id = auth.uid() and public.clerk_has_school(auth.uid(), school_id))
  );
