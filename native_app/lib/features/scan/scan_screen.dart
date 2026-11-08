import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../core/validators.dart';
import '../../data/remote/supabase_client.dart';
import '../../data/repositories/book_repository.dart';
import '../../data/repositories/metadata_repository.dart';
import '../../data/repositories/school_repository.dart';
import '../../data/sync/sync_service.dart';
import '../../shared/utils/author_split.dart';
import '../../shared/widgets/book_widgets.dart';

class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({super.key});

  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen> {
  MobileScannerController? _scannerController;
  final _isbnController = TextEditingController();
  final _titleController = TextEditingController();
  final _authorController = TextEditingController();
  final _publisherController = TextEditingController();
  final _yearController = TextEditingController();
  final _shelfLocationController = TextEditingController();
  final _sessionSearchController = TextEditingController();

  int _quantity = 1;
  String _condition = 'Good';
  String? _category;
  bool _isLookingUp = false;
  bool _saving = false;
  String? _lookupSource;

  // Duplicate handling
  List<BookRecord> _dupMatches = [];
  bool _saveAnyway = false;
  Timer? _isbnDebounce;

  // Title typeahead
  List<MetadataLookupResult> _suggestions = [];
  Timer? _titleDebounce;

  // Field-level validation messages (key -> message)
  final Map<String, String> _errors = {};

  // IDs of records saved during this scanning session (newest first)
  final List<String> _sessionIds = [];
  String _sessionSearch = '';

  bool _showCamera = true;
  bool _torchOn = false;

  // Assigned schools (for the picker)
  List<SchoolItem> _schools = [];
  bool _loadingSchools = true;

  @override
  void initState() {
    super.initState();
    if (!kIsWeb && Platform.isAndroid) {
      _scannerController = MobileScannerController(
        formats: [BarcodeFormat.ean13, BarcodeFormat.ean8, BarcodeFormat.upcA],
        detectionSpeed: DetectionSpeed.noDuplicates,
      );
    }
    _loadSchools();
  }

  Future<void> _loadSchools() async {
    final auth = ref.read(authStateProvider).value;
    if (auth?.user == null) {
      if (mounted) setState(() => _loadingSchools = false);
      return;
    }
    final list = await ref
        .read(schoolRepositoryProvider)
        .getSchoolsForUser(auth!.user!.id, auth.role);
    if (!mounted) return;
    setState(() {
      _schools = list;
      _loadingSchools = false;
    });
    if (list.isEmpty) return;

    final current = ref.read(activeSchoolProvider);
    final match = current == null
        ? null
        : list.where((s) => s.id == current.id).firstOrNull;
    final selected = match ?? list.first;
    if (current?.id != selected.id) {
      ref.read(activeSchoolProvider.notifier).select(selected);
    }
    ref.read(syncServiceProvider).pullBooksForSchool(selected.id);
  }

  void _onSchoolChanged(String? id) {
    if (id == null) return;
    final school = _schools.where((s) => s.id == id).firstOrNull;
    if (school == null) return;
    ref.read(activeSchoolProvider.notifier).select(school);
    ref.read(syncServiceProvider).pullBooksForSchool(school.id);
    setState(() {
      _sessionIds.clear();
      _dupMatches = [];
      _saveAnyway = false;
    });
  }

  @override
  void dispose() {
    _isbnDebounce?.cancel();
    _titleDebounce?.cancel();
    _scannerController?.dispose();
    _isbnController.dispose();
    _titleController.dispose();
    _authorController.dispose();
    _publisherController.dispose();
    _yearController.dispose();
    _shelfLocationController.dispose();
    _sessionSearchController.dispose();
    super.dispose();
  }

  void _snack(String message, {Color? color}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: color),
    );
  }

  // ---------------------------------------------------------------------
  // ISBN: scan, typing, duplicate check, lookup
  // ---------------------------------------------------------------------

  Future<void> _onBarcodeScanned(String rawBarcode) async {
    if (_isLookingUp) return;
    final clean = Validators.cleanIsbn(rawBarcode);
    if (clean.isEmpty) return;
    _isbnController.text = clean;
    await _performMetadataLookup(clean);
  }

  void _onIsbnChanged(String value) {
    final clean = Validators.cleanIsbn(value);
    _isbnDebounce?.cancel();
    if (clean.length == 10 || clean.length == 13) {
      final valid = Validators.isValidIsbn(clean);
      setState(() {
        if (valid) {
          _errors.remove('isbn');
        } else {
          _errors['isbn'] = "This doesn't look like a valid ISBN-${clean.length}.";
        }
      });
      _isbnDebounce = Timer(
        const Duration(milliseconds: 500),
        () => _checkDuplicates(clean),
      );
    } else {
      setState(() {
        _errors.remove('isbn');
        _dupMatches = [];
        _saveAnyway = false;
      });
    }
  }

  Future<void> _checkDuplicates(String isbn) async {
    final school = ref.read(activeSchoolProvider);
    if (school == null || isbn.trim().isEmpty) {
      if (mounted) setState(() => _dupMatches = []);
      return;
    }
    final matches =
        await ref.read(bookRepositoryProvider).findByIsbn(school.id, isbn);
    if (!mounted) return;
    setState(() {
      _dupMatches = matches;
      _saveAnyway = false;
    });
  }

  Future<void> _performMetadataLookup(String rawIsbn) async {
    final clean = Validators.cleanIsbn(rawIsbn).toUpperCase();
    if (clean.length < 10) {
      _snack('Enter a 10 or 13 digit ISBN.');
      return;
    }

    setState(() {
      _isLookingUp = true;
      _lookupSource = null;
    });

    await _checkDuplicates(clean);
    final res = await ref.read(metadataRepositoryProvider).lookup(clean);
    if (!mounted) return;

    if (res != null) {
      setState(() {
        _titleController.text = res.title;
        _authorController.text =
            res.authors.isNotEmpty ? res.authors.join(', ') : res.author;
        _publisherController.text = res.publisher;
        _yearController.text = res.year;
        final mapped = matchCategory(res.category);
        if (mapped != null) _category = mapped;
        _lookupSource = res.source;
        _suggestions = [];
        for (final k in ['title', 'author', 'publisher', 'year', 'category']) {
          _errors.remove(k);
        }
      });
    } else {
      _snack('No details found for this ISBN — fill them in manually.');
    }

    if (mounted) setState(() => _isLookingUp = false);
  }

  // ---------------------------------------------------------------------
  // Title typeahead
  // ---------------------------------------------------------------------

  void _onTitleChanged(String value) {
    if (_errors.containsKey('title')) {
      setState(() => _errors.remove('title'));
    }
    _titleDebounce?.cancel();
    if (value.trim().length < 2) {
      if (_suggestions.isNotEmpty) setState(() => _suggestions = []);
      return;
    }
    _titleDebounce = Timer(const Duration(milliseconds: 350), () async {
      final results =
          await ref.read(metadataRepositoryProvider).searchByTitle(value);
      if (!mounted) return;
      // Ignore stale responses
      if (_titleController.text != value) return;
      setState(() => _suggestions = results);
    });
  }

  void _applySuggestion(MetadataLookupResult r) {
    setState(() {
      _titleController.text = r.title;
      _authorController.text =
          r.authors.isNotEmpty ? r.authors.join(', ') : r.author;
      _publisherController.text = r.publisher;
      _yearController.text = r.year;
      final mapped = matchCategory(r.category);
      if (mapped != null) _category = mapped;
      if (_isbnController.text.trim().isEmpty && r.isbn.isNotEmpty) {
        _isbnController.text = r.isbn;
      }
      _lookupSource = r.source;
      _suggestions = [];
      for (final k in ['title', 'author', 'publisher', 'year', 'category']) {
        _errors.remove(k);
      }
    });
    final isbn = Validators.cleanIsbn(_isbnController.text);
    if (isbn.length == 10 || isbn.length == 13) _checkDuplicates(isbn);
  }

  // ---------------------------------------------------------------------
  // Validation + saving
  // ---------------------------------------------------------------------

  bool _validate() {
    final errors = <String, String>{};
    if (_titleController.text.trim().isEmpty) {
      errors['title'] = 'Title is required.';
    }
    if (AuthorUtils.splitAuthors(_authorController.text).isEmpty) {
      errors['author'] = 'Author is required.';
    }

    final isbn = Validators.cleanIsbn(_isbnController.text);
    if (isbn.isEmpty) {
      errors['isbn'] = 'ISBN is required.';
    } else if (isbn.length != 10 && isbn.length != 13) {
      errors['isbn'] = 'ISBN must be 10 or 13 digits.';
    } else if (!Validators.isValidIsbn(isbn)) {
      errors['isbn'] = "This doesn't look like a valid ISBN-${isbn.length}.";
    }

    if (_publisherController.text.trim().isEmpty) {
      errors['publisher'] = 'Publisher is required.';
    }
    if (_category == null) errors['category'] = 'Category is required.';

    final yearErr = validateYearRange(_yearController.text, required: true);
    if (yearErr != null) errors['year'] = yearErr;

    setState(() {
      _errors
        ..clear()
        ..addAll(errors);
    });
    return errors.isEmpty;
  }

  Future<void> _saveCurrentBook() async {
    if (_saving) return;

    final activeSchool = ref.read(activeSchoolProvider);
    final authData = ref.read(authStateProvider).value;

    if (activeSchool == null) {
      _snack('Please select an active school first.');
      return;
    }
    if (authData?.user == null) {
      _snack('Not authenticated.');
      return;
    }
    if (!_validate()) {
      _snack('Please fix the validation errors before saving.');
      return;
    }

    setState(() => _saving = true);
    try {
      final authors = AuthorUtils.splitAuthors(_authorController.text);
      final title = _titleController.text.trim();
      final shelf = _shelfLocationController.text.trim();

      final id = await ref.read(bookRepositoryProvider).saveBook(
            isbn: Validators.cleanIsbn(_isbnController.text).toUpperCase(),
            title: title,
            author: authors[0],
            author2: authors.length > 1 ? authors[1] : null,
            author3: authors.length > 2 ? authors[2] : null,
            author4: authors.length > 3 ? authors[3] : null,
            author5: authors.length > 4 ? authors[4] : null,
            publisher: _publisherController.text.trim(),
            year: _yearController.text.trim(),
            quantity: _quantity,
            condition: _condition,
            category: _category,
            shelfLocation: shelf.isEmpty ? null : shelf,
            schoolId: activeSchool.id,
            clerkId: authData!.user!.id,
            flaggedAsDuplicate: _dupMatches.isNotEmpty && _saveAnyway,
          );

      if (!mounted) return;
      setState(() {
        _sessionIds.insert(0, id);
        _clearFormForNextScan();
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Saved "$title"'),
          duration: const Duration(seconds: 3),
          backgroundColor: AppTheme.successColor,
          action: SnackBarAction(
            label: 'UNDO',
            textColor: Colors.white,
            onPressed: () => _undoSave(id),
          ),
        ),
      );
    } catch (e) {
      _snack('Could not save: $e', color: AppTheme.errorColor);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _addToCopyCount(BookRecord existing) async {
    final newQty = existing.quantity + _quantity;
    try {
      await ref.read(bookRepositoryProvider).setQuantity(existing, newQty);
      if (!mounted) return;
      _snack(
        'Copy count updated — "${existing.title ?? 'Untitled'}" now has '
        '$newQty ${newQty == 1 ? "copy" : "copies"}.',
        color: AppTheme.successColor,
      );
      setState(_clearFormForNextScan);
    } catch (e) {
      _snack('Failed to update copy count: $e', color: AppTheme.errorColor);
    }
  }

  Future<void> _undoSave(String id) async {
    await ref.read(bookRepositoryProvider).deleteBook(id);
    if (!mounted) return;
    setState(() => _sessionIds.remove(id));
  }

  void _clearFormForNextScan() {
    _isbnController.clear();
    _titleController.clear();
    _authorController.clear();
    _publisherController.clear();
    _yearController.clear();
    // Shelf location is kept on purpose: clerks usually scan a whole shelf.
    _quantity = 1;
    _condition = 'Good';
    _category = null;
    _isLookingUp = false;
    _lookupSource = null;
    _dupMatches = [];
    _saveAnyway = false;
    _suggestions = [];
    _errors.clear();
  }

  // ---------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final activeSchool = ref.watch(activeSchoolProvider);
    final booksAsync = ref.watch(schoolBooksStreamProvider);
    final isMobile = !kIsWeb && Platform.isAndroid;

    final byId = {
      for (final b in booksAsync.value ?? <BookRecord>[]) b.id: b,
    };
    final sessionBooks =
        _sessionIds.map((id) => byId[id]).whereType<BookRecord>().toList();

    final hasDup = _dupMatches.isNotEmpty;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Scan & Collect'),
            if (activeSchool != null)
              Text(
                activeSchool.name,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.white.withValues(alpha: 0.75),
                  fontWeight: FontWeight.normal,
                ),
              ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'View Collected Records',
            icon: const Icon(Icons.list_alt_rounded),
            onPressed: () => context.go('/clerk'),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            if (isMobile && _showCamera) _buildCamera(),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _buildSchoolPicker(activeSchool),
                    _buildIsbnRow(isMobile),
                    if (_lookupSource != null) _buildLookupBadge(),
                    if (hasDup && !_saveAnyway) _buildDuplicateBanner(),
                    const SizedBox(height: 14),
                    TextField(
                      controller: _titleController,
                      onChanged: _onTitleChanged,
                      textCapitalization: TextCapitalization.words,
                      decoration: InputDecoration(
                        labelText: 'Book Title *',
                        prefixIcon: const Icon(Icons.book_outlined),
                        errorText: _errors['title'],
                      ),
                    ),
                    if (_suggestions.isNotEmpty) _buildSuggestions(),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _authorController,
                      onChanged: (_) {
                        if (_errors.containsKey('author')) {
                          setState(() => _errors.remove('author'));
                        }
                      },
                      textCapitalization: TextCapitalization.words,
                      decoration: InputDecoration(
                        labelText: 'Author(s) *',
                        helperText:
                            'Up to 5 authors, separated by commas or semicolons',
                        prefixIcon: const Icon(Icons.person_outline),
                        errorText: _errors['author'],
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          flex: 2,
                          child: TextField(
                            controller: _publisherController,
                            onChanged: (_) {
                              if (_errors.containsKey('publisher')) {
                                setState(() => _errors.remove('publisher'));
                              }
                            },
                            decoration: InputDecoration(
                              labelText: 'Publisher *',
                              errorText: _errors['publisher'],
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          flex: 1,
                          child: TextField(
                            controller: _yearController,
                            keyboardType: TextInputType.number,
                            onChanged: (_) {
                              if (_errors.containsKey('year')) {
                                setState(() => _errors.remove('year'));
                              }
                            },
                            decoration: InputDecoration(
                              labelText: 'Year *',
                              errorText: _errors['year'],
                              errorMaxLines: 2,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    DropdownButtonFormField<String>(
                      // Key changes with the value so autofill updates the field.
                      key: ValueKey('category-${_category ?? 'none'}'),
                      initialValue: _category,
                      isExpanded: true,
                      decoration: InputDecoration(
                        labelText: 'Category *',
                        errorText: _errors['category'],
                      ),
                      items: [
                        for (final c in kBookCategories)
                          DropdownMenuItem(value: c, child: Text(c)),
                      ],
                      onChanged: (val) => setState(() {
                        _category = val;
                        _errors.remove('category');
                      }),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(child: _buildQuantityStepper()),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: _shelfLocationController,
                            decoration: const InputDecoration(
                              labelText: 'Shelf Location',
                              hintText: 'e.g. Section B, Row 4',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        const Text('Condition: ',
                            style: TextStyle(fontWeight: FontWeight.w600)),
                        const SizedBox(width: 8),
                        for (final cond in kConditions)
                          Padding(
                            padding: const EdgeInsets.only(right: 6),
                            child: ChoiceChip(
                              label: Text(cond),
                              selected: _condition == cond,
                              onSelected: (sel) {
                                if (sel) setState(() => _condition = cond);
                              },
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton.icon(
                      icon: _saving
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                  strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.save_outlined),
                      label: Text(
                        _saving ? 'Saving…' : 'Save & Scan Next',
                        style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      onPressed: (_saving || (hasDup && !_saveAnyway))
                          ? null
                          : _saveCurrentBook,
                    ),
                    if (hasDup && _saveAnyway) ...[
                      const SizedBox(height: 8),
                      const Text(
                        'This will be saved as a separate record and flagged as a duplicate.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: 12, color: AppTheme.warningColor),
                      ),
                    ],
                    if (sessionBooks.isNotEmpty) ..._buildSession(sessionBooks),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------
  // Build helpers
  // ---------------------------------------------------------------------

  Widget _buildCamera() {
    return Container(
      height: 220,
      color: Colors.black,
      child: Stack(
        children: [
          MobileScanner(
            controller: _scannerController,
            onDetect: (capture) {
              final raw = capture.barcodes.firstOrNull?.rawValue;
              if (raw != null) _onBarcodeScanned(raw);
            },
          ),
          Center(
            child: Container(
              width: 240,
              height: 120,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white70, width: 2),
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          Positioned(
            top: 12,
            right: 12,
            child: Row(
              children: [
                IconButton(
                  icon: Icon(
                    _torchOn ? Icons.flash_on : Icons.flash_off,
                    color: Colors.white,
                  ),
                  onPressed: () {
                    _scannerController?.toggleTorch();
                    setState(() => _torchOn = !_torchOn);
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white),
                  onPressed: () => setState(() => _showCamera = false),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSchoolPicker(SchoolItem? activeSchool) {
    if (_loadingSchools) {
      return const Padding(
        padding: EdgeInsets.only(bottom: 14),
        child: LinearProgressIndicator(),
      );
    }
    if (_schools.isEmpty) {
      return Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppTheme.warningColor.withValues(alpha: 0.10),
          borderRadius: BorderRadius.circular(10),
          border:
              Border.all(color: AppTheme.warningColor.withValues(alpha: 0.4)),
        ),
        child: const Row(
          children: [
            Icon(Icons.info_outline, color: AppTheme.warningColor, size: 20),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'No school is assigned to your account yet. '
                'Ask your manager to assign one, then reopen this screen.',
                style: TextStyle(fontSize: 12, color: AppTheme.textPrimary),
              ),
            ),
          ],
        ),
      );
    }
    if (activeSchool == null) return const SizedBox.shrink();
    final inList = _schools.any((s) => s.id == activeSchool.id);
    if (_schools.length < 2 || !inList) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: DropdownButtonFormField<String>(
        key: ValueKey('school-${activeSchool.id}'),
        initialValue: activeSchool.id,
        isExpanded: true,
        decoration: const InputDecoration(
          labelText: 'Active School',
          prefixIcon: Icon(Icons.school_outlined),
        ),
        items: [
          for (final s in _schools)
            DropdownMenuItem(
              value: s.id,
              child: Text(s.name, overflow: TextOverflow.ellipsis),
            ),
        ],
        onChanged: _onSchoolChanged,
      ),
    );
  }

  Widget _buildIsbnRow(bool isMobile) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: TextField(
            controller: _isbnController,
            keyboardType: TextInputType.text,
            onChanged: _onIsbnChanged,
            decoration: InputDecoration(
              labelText: 'ISBN *',
              hintText: 'Scan or type 10/13 digit ISBN',
              prefixIcon: const Icon(Icons.qr_code_scanner),
              errorText: _errors['isbn'],
              suffixIcon: _isLookingUp
                  ? const Padding(
                      padding: EdgeInsets.all(12),
                      child: SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    )
                  : IconButton(
                      tooltip: 'Look up details',
                      icon: const Icon(Icons.search),
                      onPressed: () =>
                          _performMetadataLookup(_isbnController.text),
                    ),
            ),
            onSubmitted: (val) => _performMetadataLookup(val),
          ),
        ),
        if (isMobile && !_showCamera) ...[
          const SizedBox(width: 8),
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: IconButton.filled(
              icon: const Icon(Icons.camera_alt_outlined),
              onPressed: () => setState(() => _showCamera = true),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildLookupBadge() {
    final label = _lookupSource == 'local_cache'
        ? 'Offline Cache'
        : _lookupSource == 'supabase_pool'
            ? 'School Catalog'
            : 'Google Books';
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Row(
        children: [
          const Icon(Icons.check_circle_outline,
              color: AppTheme.successColor, size: 16),
          const SizedBox(width: 4),
          Text(
            'Autofilled from $label',
            style: const TextStyle(
              color: AppTheme.successColor,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDuplicateBanner() {
    final first = _dupMatches.first;
    final newQty = first.quantity + _quantity;
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppTheme.warningColor.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.warningColor.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.warning_amber_rounded,
                  color: AppTheme.warningColor, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'This book may already be in the system.',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '"${first.title ?? 'Untitled'}" by '
                      '${first.authorsDisplay.isEmpty ? 'Unknown' : first.authorsDisplay} '
                      'appears ${_dupMatches.length} '
                      '${_dupMatches.length == 1 ? "time" : "times"} at this school.',
                      style: const TextStyle(
                          fontSize: 12, color: AppTheme.textSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          OutlinedButton.icon(
            icon: const Icon(Icons.info_outline, size: 16),
            label: const Text('View existing record'),
            onPressed: () => showBookDetailSheet(context, first),
          ),
          const SizedBox(height: 6),
          OutlinedButton.icon(
            icon: const Icon(Icons.exposure_plus_1, size: 16),
            label: Text('Add to copy count — set copies to $newQty'),
            onPressed: () => _addToCopyCount(first),
          ),
          const SizedBox(height: 6),
          TextButton(
            onPressed: () => setState(() => _saveAnyway = true),
            child: const Text('Save as a separate record anyway'),
          ),
        ],
      ),
    );
  }

  Widget _buildSuggestions() {
    return Container(
      margin: const EdgeInsets.only(top: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Column(
        children: [
          for (var i = 0; i < _suggestions.length; i++) ...[
            if (i > 0) const Divider(height: 1),
            InkWell(
              onTap: () => _applySuggestion(_suggestions[i]),
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                child: Row(
                  children: [
                    const Icon(Icons.auto_stories_outlined,
                        size: 18, color: AppTheme.textSecondary),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _suggestions[i].title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 14),
                          ),
                          Text(
                            [
                              _suggestions[i].author,
                              _suggestions[i].publisher,
                              _suggestions[i].year,
                            ].where((e) => e.isNotEmpty).join(' • '),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontSize: 12, color: AppTheme.textSecondary),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildQuantityStepper() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text('Copies',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          IconButton(
            visualDensity: VisualDensity.compact,
            icon: const Icon(Icons.remove, size: 18),
            onPressed:
                _quantity > 1 ? () => setState(() => _quantity--) : null,
          ),
          Text(
            '$_quantity',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          IconButton(
            visualDensity: VisualDensity.compact,
            icon: const Icon(Icons.add, size: 18),
            onPressed: () => setState(() => _quantity++),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildSession(List<BookRecord> books) {
    final totalCopies = books.fold<int>(0, (sum, b) => sum + b.quantity);
    final q = _sessionSearch.trim().toLowerCase();
    final filtered = q.isEmpty
        ? books
        : books.where((b) {
            return (b.title ?? '').toLowerCase().contains(q) ||
                b.authorsDisplay.toLowerCase().contains(q) ||
                (b.isbn ?? '').toLowerCase().contains(q);
          }).toList();

    return [
      const SizedBox(height: 24),
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              'This session: ${books.length} '
              '${books.length == 1 ? "scan" : "scans"} • '
              '$totalCopies ${totalCopies == 1 ? "book" : "books"}',
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
            ),
          ),
          TextButton(
            onPressed: () => _undoSave(books.first.id),
            child: const Text('Undo Last'),
          ),
        ],
      ),
      if (books.length > 5) ...[
        const SizedBox(height: 6),
        TextField(
          controller: _sessionSearchController,
          onChanged: (v) => setState(() => _sessionSearch = v),
          decoration: InputDecoration(
            hintText: 'Search this session…',
            prefixIcon: const Icon(Icons.search, size: 20),
            contentPadding: const EdgeInsets.symmetric(vertical: 10),
            suffixIcon: _sessionSearch.isEmpty
                ? null
                : IconButton(
                    icon: const Icon(Icons.clear, size: 18),
                    onPressed: () {
                      _sessionSearchController.clear();
                      setState(() => _sessionSearch = '');
                    },
                  ),
          ),
        ),
      ],
      const SizedBox(height: 8),
      for (final b in filtered) _buildSessionCard(b),
      if (filtered.isEmpty)
        const Padding(
          padding: EdgeInsets.all(12),
          child: Center(
            child: Text('No matching scans.',
                style: TextStyle(color: AppTheme.textSecondary)),
          ),
        ),
    ];
  }

  Widget _buildSessionCard(BookRecord b) {
    final repo = ref.read(bookRepositoryProvider);
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => showBookDetailSheet(
          context,
          b,
          onEdit: () => showEditBookDialog(context, b),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 4, 10),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      b.title ?? 'Untitled',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontWeight: FontWeight.w600, fontSize: 14),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      [
                        if (b.authorsDisplay.isNotEmpty) b.authorsDisplay,
                        if ((b.condition ?? '').isNotEmpty) b.condition!,
                        if ((b.shelfLocation ?? '').isNotEmpty)
                          b.shelfLocation!,
                      ].join(' • '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 12, color: AppTheme.textSecondary),
                    ),
                    if (b.flaggedAsDuplicate)
                      const Padding(
                        padding: EdgeInsets.only(top: 4),
                        child: Text(
                          'Flagged as duplicate',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.warningColor,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              IconButton(
                visualDensity: VisualDensity.compact,
                tooltip: 'Fewer copies',
                icon: const Icon(Icons.remove_circle_outline, size: 20),
                onPressed:
                    b.quantity > 1 ? () => repo.setQuantity(b, b.quantity - 1) : null,
              ),
              Text('${b.quantity}',
                  style: const TextStyle(fontWeight: FontWeight.bold)),
              IconButton(
                visualDensity: VisualDensity.compact,
                tooltip: 'More copies',
                icon: const Icon(Icons.add_circle_outline, size: 20),
                onPressed: () => repo.setQuantity(b, b.quantity + 1),
              ),
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert, size: 20),
                onSelected: (v) async {
                  if (v == 'edit') {
                    await showEditBookDialog(context, b);
                  } else if (v == 'delete') {
                    final deleted =
                        await deleteBookWithConfirm(context, ref, b);
                    if (deleted && mounted) {
                      setState(() => _sessionIds.remove(b.id));
                    }
                  }
                },
                itemBuilder: (ctx) => const [
                  PopupMenuItem(value: 'edit', child: Text('Edit')),
                  PopupMenuItem(value: 'delete', child: Text('Delete')),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
