import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../data/repositories/book_repository.dart';
import '../utils/author_split.dart';

// ---------------------------------------------------------------------------
// Detail bottom sheet
// ---------------------------------------------------------------------------

/// Read-only view of one book. [onEdit] adds an "Edit book" button.
Future<void> showBookDetailSheet(
  BuildContext context,
  BookRecord book, {
  VoidCallback? onEdit,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    backgroundColor: Colors.white,
    builder: (ctx) => _BookDetailContent(
      book: book,
      onEdit: onEdit == null
          ? null
          : () {
              Navigator.of(ctx).pop();
              onEdit();
            },
    ),
  );
}

class _BookDetailContent extends StatelessWidget {
  final BookRecord book;
  final VoidCallback? onEdit;

  const _BookDetailContent({required this.book, this.onEdit});

  @override
  Widget build(BuildContext context) {
    final items = <MapEntry<String, String?>>[
      MapEntry('ISBN', book.isbn),
      MapEntry('Author(s)', book.authorsDisplay),
      MapEntry('Publisher', book.publisher),
      MapEntry('Year', book.year),
      MapEntry('Copies', book.quantity.toString()),
      MapEntry('Condition', book.condition),
      MapEntry('Category', book.category),
      MapEntry('Shelf location', book.shelfLocation),
    ];

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              (book.title ?? '').isEmpty ? 'Untitled' : book.title!,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Added on ${DateFormat('d MMM yyyy').format(book.updatedAt)}',
              style: const TextStyle(
                fontSize: 13,
                color: AppTheme.textSecondary,
              ),
            ),
            if (book.flaggedAsDuplicate) ...[
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerLeft,
                child: Chip(
                  avatar: const Icon(Icons.warning_amber_rounded,
                      size: 16, color: AppTheme.warningColor),
                  label: const Text('Flagged as duplicate'),
                  backgroundColor:
                      AppTheme.warningColor.withValues(alpha: 0.12),
                ),
              ),
            ],
            const SizedBox(height: 16),
            LayoutBuilder(
              builder: (context, constraints) {
                final colWidth = (constraints.maxWidth - 16) / 2;
                return Wrap(
                  spacing: 16,
                  runSpacing: 14,
                  children: [
                    for (final e in items)
                      SizedBox(
                        width: e.key == 'Shelf location' ||
                                e.key == 'Author(s)'
                            ? constraints.maxWidth
                            : colWidth,
                        child: _DetailItem(label: e.key, value: e.value),
                      ),
                  ],
                );
              },
            ),
            if (onEdit != null) ...[
              const SizedBox(height: 24),
              ElevatedButton.icon(
                icon: const Icon(Icons.edit_outlined, size: 18),
                label: const Text('Edit book'),
                onPressed: onEdit,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _DetailItem extends StatelessWidget {
  final String label;
  final String? value;

  const _DetailItem({required this.label, this.value});

  @override
  Widget build(BuildContext context) {
    final has = value != null && value!.trim().isNotEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8,
            color: AppTheme.textSecondary,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          has ? value! : '—',
          style: TextStyle(
            fontSize: 14,
            color: has
                ? AppTheme.textPrimary
                : AppTheme.textSecondary.withValues(alpha: 0.6),
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Edit dialog
// ---------------------------------------------------------------------------

/// Opens the edit dialog. Returns true when the book was saved.
Future<bool?> showEditBookDialog(BuildContext context, BookRecord book) {
  return showDialog<bool>(
    context: context,
    builder: (_) => EditBookDialog(book: book),
  );
}

class EditBookDialog extends ConsumerStatefulWidget {
  final BookRecord book;

  const EditBookDialog({super.key, required this.book});

  @override
  ConsumerState<EditBookDialog> createState() => _EditBookDialogState();
}

class _EditBookDialogState extends ConsumerState<EditBookDialog> {
  late final TextEditingController _isbn;
  late final TextEditingController _title;
  late final TextEditingController _author;
  late final TextEditingController _publisher;
  late final TextEditingController _year;
  late final TextEditingController _shelf;
  late int _quantity;
  String? _condition;
  String? _category;
  final Map<String, String> _errors = {};
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final b = widget.book;
    _isbn = TextEditingController(text: b.isbn ?? '');
    _title = TextEditingController(text: b.title ?? '');
    _author = TextEditingController(text: b.authorsDisplay);
    _publisher = TextEditingController(text: b.publisher ?? '');
    _year = TextEditingController(text: b.year ?? '');
    _shelf = TextEditingController(text: b.shelfLocation ?? '');
    _quantity = b.quantity < 1 ? 1 : b.quantity;
    _condition = (b.condition != null && b.condition!.isNotEmpty)
        ? b.condition
        : null;
    _category =
        (b.category != null && b.category!.isNotEmpty) ? b.category : null;
  }

  @override
  void dispose() {
    _isbn.dispose();
    _title.dispose();
    _author.dispose();
    _publisher.dispose();
    _year.dispose();
    _shelf.dispose();
    super.dispose();
  }

  String? _nullIfEmpty(String v) => v.trim().isEmpty ? null : v.trim();

  Future<void> _save() async {
    final title = _title.text.trim();
    final authors = AuthorUtils.splitAuthors(_author.text);

    final errors = <String, String>{};
    if (title.isEmpty) errors['title'] = 'Title is required.';
    if (authors.isEmpty) errors['author'] = 'Author is required.';
    final yearErr = validateYearRange(_year.text);
    if (yearErr != null) errors['year'] = yearErr;

    if (errors.isNotEmpty) {
      setState(() {
        _errors
          ..clear()
          ..addAll(errors);
      });
      return;
    }

    setState(() {
      _errors.clear();
      _saving = true;
    });

    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    final b = widget.book;

    try {
      await ref.read(bookRepositoryProvider).saveBook(
            id: b.id,
            isbn: _nullIfEmpty(_isbn.text)?.toUpperCase(),
            title: title,
            author: authors[0],
            author2: authors.length > 1 ? authors[1] : null,
            author3: authors.length > 2 ? authors[2] : null,
            author4: authors.length > 3 ? authors[3] : null,
            author5: authors.length > 4 ? authors[4] : null,
            publisher: _nullIfEmpty(_publisher.text),
            year: _nullIfEmpty(_year.text),
            quantity: _quantity < 1 ? 1 : _quantity,
            condition: _condition,
            category: _category,
            shelfLocation: _nullIfEmpty(_shelf.text),
            notes: b.notes,
            schoolId: b.schoolId,
            clerkId: b.clerkId,
            flaggedAsDuplicate: b.flaggedAsDuplicate,
          );
      navigator.pop(true);
      messenger.showSnackBar(
        const SnackBar(content: Text('Book updated')),
      );
    } catch (e) {
      if (mounted) setState(() => _saving = false);
      messenger.showSnackBar(
        SnackBar(
          content: Text('Could not save: $e'),
          backgroundColor: AppTheme.errorColor,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final categories = <String>[
      ...kBookCategories,
      if (_category != null && !kBookCategories.contains(_category))
        _category!,
    ];
    final conditions = <String>[
      ...kConditions,
      if (_condition != null && !kConditions.contains(_condition))
        _condition!,
    ];

    return AlertDialog(
      title: const Text('Edit book'),
      content: SizedBox(
        width: 440,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 4),
              TextField(
                controller: _isbn,
                decoration: const InputDecoration(labelText: 'ISBN'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _title,
                decoration: InputDecoration(
                  labelText: 'Title *',
                  errorText: _errors['title'],
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _author,
                decoration: InputDecoration(
                  labelText: 'Author(s) *',
                  helperText: 'Separate several authors with commas',
                  errorText: _errors['author'],
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: TextField(
                      controller: _publisher,
                      decoration:
                          const InputDecoration(labelText: 'Publisher'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _year,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: 'Year',
                        errorText: _errors['year'],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _condition,
                      decoration:
                          const InputDecoration(labelText: 'Condition'),
                      items: [
                        for (final c in conditions)
                          DropdownMenuItem(value: c, child: Text(c)),
                      ],
                      onChanged: (v) => setState(() => _condition = v),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _category,
                      isExpanded: true,
                      decoration:
                          const InputDecoration(labelText: 'Category'),
                      items: [
                        for (final c in categories)
                          DropdownMenuItem(value: c, child: Text(c)),
                      ],
                      onChanged: (v) => setState(() => _category = v),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppTheme.borderColor),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Copies',
                              style: TextStyle(fontWeight: FontWeight.w600)),
                          IconButton(
                            visualDensity: VisualDensity.compact,
                            icon: const Icon(Icons.remove, size: 18),
                            onPressed: _quantity > 1
                                ? () => setState(() => _quantity--)
                                : null,
                          ),
                          Text('$_quantity',
                              style: const TextStyle(
                                  fontSize: 16, fontWeight: FontWeight.bold)),
                          IconButton(
                            visualDensity: VisualDensity.compact,
                            icon: const Icon(Icons.add, size: 18),
                            onPressed: () => setState(() => _quantity++),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _shelf,
                      decoration:
                          const InputDecoration(labelText: 'Shelf location'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _saving ? null : () => Navigator.of(context).pop(false),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _saving ? null : _save,
          child: _saving
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: Colors.white),
                )
              : const Text('Save changes'),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Delete confirmation
// ---------------------------------------------------------------------------

/// Asks for confirmation, then deletes the record (local + queued sync).
/// Returns true when the record was deleted.
Future<bool> deleteBookWithConfirm(
  BuildContext context,
  WidgetRef ref,
  BookRecord book,
) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Delete record?'),
      content: Text(
        '"${(book.title ?? '').isEmpty ? 'Untitled' : book.title}" will be '
        'permanently removed. This cannot be undone.',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: AppTheme.errorColor),
          onPressed: () => Navigator.of(ctx).pop(true),
          child: const Text('Delete'),
        ),
      ],
    ),
  );

  if (ok != true) return false;
  await ref.read(bookRepositoryProvider).deleteBook(book.id);
  if (context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Book deleted')),
    );
  }
  return true;
}
