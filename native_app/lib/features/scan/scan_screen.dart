import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../core/theme.dart';
import '../../core/validators.dart';
import '../../data/remote/supabase_client.dart';
import '../../data/repositories/book_repository.dart';
import '../../data/repositories/metadata_repository.dart';
import '../../data/repositories/school_repository.dart';

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
  final _author2Controller = TextEditingController();
  final _author3Controller = TextEditingController();
  final _publisherController = TextEditingController();
  final _yearController = TextEditingController();
  final _shelfLocationController = TextEditingController();
  final _notesController = TextEditingController();

  int _quantity = 1;
  String _condition = 'Good';
  String? _category;
  bool _isLookingUp = false;
  String? _lookupSource;
  bool _isDuplicateWarning = false;

  final List<BookRecord> _sessionScans = [];
  bool _showCamera = true;
  bool _torchOn = false;

  final List<String> _categories = [
    'Academic',
    'Textbook',
    'Fiction',
    'Non-Fiction',
    'Reference',
    'Children',
    'Other',
  ];

  @override
  void initState() {
    super.initState();
    if (!kIsWeb && Platform.isAndroid) {
      _scannerController = MobileScannerController(
        formats: [BarcodeFormat.ean13, BarcodeFormat.ean8, BarcodeFormat.upcA],
        detectionSpeed: DetectionSpeed.noDuplicates,
      );
    }
  }

  @override
  void dispose() {
    _scannerController?.dispose();
    _isbnController.dispose();
    _titleController.dispose();
    _authorController.dispose();
    _author2Controller.dispose();
    _author3Controller.dispose();
    _publisherController.dispose();
    _yearController.dispose();
    _shelfLocationController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _onBarcodeScanned(String rawBarcode) async {
    final clean = Validators.cleanIsbn(rawBarcode);
    if (clean.isEmpty) return;

    _isbnController.text = clean;
    await _performMetadataLookup(clean);
  }

  Future<void> _performMetadataLookup(String cleanIsbn) async {
    setState(() {
      _isLookingUp = true;
      _lookupSource = null;
      _isDuplicateWarning = false;
    });

    final activeSchool = ref.read(activeSchoolProvider);
    if (activeSchool != null) {
      final existingBooks =
          await ref.read(bookRepositoryProvider).getBooks(activeSchool.id);
      final hasDup = existingBooks.any((b) => b.isbn == cleanIsbn);
      if (hasDup) {
        setState(() => _isDuplicateWarning = true);
      }
    }

    final metaRepo = ref.read(metadataRepositoryProvider);
    final res = await metaRepo.lookup(cleanIsbn);

    if (res != null) {
      setState(() {
        _titleController.text = res.title;
        _authorController.text = res.authors.isNotEmpty ? res.authors[0] : res.author;
        if (res.authors.length > 1) _author2Controller.text = res.authors[1];
        if (res.authors.length > 2) _author3Controller.text = res.authors[2];
        _publisherController.text = res.publisher;
        _yearController.text = res.year;
        if (res.category != null && res.category!.isNotEmpty) {
          _category = res.category;
        }
        _lookupSource = res.source;
      });
    }

    if (mounted) {
      setState(() => _isLookingUp = false);
    }
  }

  Future<void> _saveCurrentBook() async {
    final activeSchool = ref.read(activeSchoolProvider);
    final authData = ref.read(authStateProvider).value;

    if (activeSchool == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select an active school first.')),
      );
      return;
    }

    if (authData?.user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Not authenticated.')),
      );
      return;
    }

    final title = _titleController.text.trim();
    if (title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Book title is required.')),
      );
      return;
    }

    final bookRepo = ref.read(bookRepositoryProvider);
    await bookRepo.saveBook(
      isbn: _isbnController.text.trim().isEmpty ? null : _isbnController.text.trim(),
      title: title,
      author: _authorController.text.trim().isEmpty ? null : _authorController.text.trim(),
      author2: _author2Controller.text.trim().isEmpty ? null : _author2Controller.text.trim(),
      author3: _author3Controller.text.trim().isEmpty ? null : _author3Controller.text.trim(),
      publisher: _publisherController.text.trim().isEmpty ? null : _publisherController.text.trim(),
      year: _yearController.text.trim().isEmpty ? null : _yearController.text.trim(),
      quantity: _quantity,
      condition: _condition,
      category: _category,
      shelfLocation: _shelfLocationController.text.trim().isEmpty
          ? null
          : _shelfLocationController.text.trim(),
      notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      schoolId: activeSchool.id,
      clerkId: authData!.user!.id,
      flaggedAsDuplicate: _isDuplicateWarning,
    );

    final newRecord = BookRecord(
      id: '',
      isbn: _isbnController.text.trim(),
      title: title,
      author: _authorController.text.trim(),
      quantity: _quantity,
      condition: _condition,
      shelfLocation: _shelfLocationController.text.trim(),
      schoolId: activeSchool.id,
      clerkId: authData.user!.id,
      updatedAt: DateTime.now(),
    );

    setState(() {
      _sessionScans.insert(0, newRecord);
      _clearFormForNextScan();
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Saved "$title"'),
          duration: const Duration(seconds: 2),
          backgroundColor: AppTheme.successColor,
          action: SnackBarAction(
            label: 'UNDO',
            textColor: Colors.white,
            onPressed: _undoLastSave,
          ),
        ),
      );
    }
  }

  void _undoLastSave() async {
    if (_sessionScans.isEmpty) return;
    final last = _sessionScans.removeAt(0);
    setState(() {});
    if (last.id.isNotEmpty) {
      await ref.read(bookRepositoryProvider).deleteBook(last.id);
    }
  }

  void _clearFormForNextScan() {
    _isbnController.clear();
    _titleController.clear();
    _authorController.clear();
    _author2Controller.clear();
    _author3Controller.clear();
    _publisherController.clear();
    _yearController.clear();
    _notesController.clear();
    _quantity = 1;
    _condition = 'Good';
    _isLookingUp = false;
    _lookupSource = null;
    _isDuplicateWarning = false;
  }

  @override
  Widget build(BuildContext context) {
    final activeSchool = ref.watch(activeSchoolProvider);
    final isMobile = !kIsWeb && Platform.isAndroid;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Scan & Collect'),
            if (activeSchool != null)
              Text(
                activeSchool.name,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppTheme.textSecondary,
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
            if (isMobile && _showCamera)
              Container(
                height: 220,
                color: Colors.black,
                child: Stack(
                  children: [
                    MobileScanner(
                      controller: _scannerController,
                      onDetect: (capture) {
                        final raw = capture.barcodes.firstOrNull?.rawValue;
                        if (raw != null) {
                          _onBarcodeScanned(raw);
                        }
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
              ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _isbnController,
                            keyboardType: TextInputType.number,
                            decoration: InputDecoration(
                              labelText: 'ISBN Barcode',
                              hintText: 'Scan or type 10/13 digit ISBN',
                              prefixIcon: const Icon(Icons.qr_code_scanner),
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
                                      icon: const Icon(Icons.search),
                                      onPressed: () {
                                        final isbn = _isbnController.text.trim();
                                        if (isbn.isNotEmpty) {
                                          _performMetadataLookup(isbn);
                                        }
                                      },
                                    ),
                            ),
                            onSubmitted: (val) {
                              if (val.trim().isNotEmpty) {
                                _performMetadataLookup(val.trim());
                              }
                            },
                          ),
                        ),
                        if (isMobile && !_showCamera) ...[
                          const SizedBox(width: 8),
                          IconButton.filled(
                            icon: const Icon(Icons.camera_alt_outlined),
                            onPressed: () => setState(() => _showCamera = true),
                          ),
                        ],
                      ],
                    ),
                    if (_lookupSource != null) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.check_circle_outline,
                              color: AppTheme.successColor, size: 16),
                          const SizedBox(width: 4),
                          Text(
                            'Autofilled from ${_lookupSource == "local_cache" ? "Offline Cache" : _lookupSource == "supabase_pool" ? "School Catalog" : "Google Books"}',
                            style: const TextStyle(
                              color: AppTheme.successColor,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ],
                    if (_isDuplicateWarning) ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppTheme.warningColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: AppTheme.warningColor.withValues(alpha: 0.4),
                          ),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.warning_amber_rounded,
                                color: AppTheme.warningColor, size: 20),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'A book with this ISBN already exists for this school. Saving will tag it as duplicate.',
                                style: TextStyle(
                                  color: Color(0xFFB45309),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 14),
                    TextField(
                      controller: _titleController,
                      decoration: const InputDecoration(
                        labelText: 'Book Title *',
                        prefixIcon: Icon(Icons.book_outlined),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _authorController,
                      decoration: const InputDecoration(
                        labelText: 'Primary Author',
                        prefixIcon: Icon(Icons.person_outline),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _author2Controller,
                            decoration: const InputDecoration(
                              labelText: 'Author 2',
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: _author3Controller,
                            decoration: const InputDecoration(
                              labelText: 'Author 3',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          flex: 2,
                          child: TextField(
                            controller: _publisherController,
                            decoration: const InputDecoration(
                              labelText: 'Publisher',
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          flex: 1,
                          child: TextField(
                            controller: _yearController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Year',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    DropdownButtonFormField<String>(
                      initialValue: _category,
                      decoration: const InputDecoration(labelText: 'Category'),
                      items: _categories.map((c) {
                        return DropdownMenuItem(value: c, child: Text(c));
                      }).toList(),
                      onChanged: (val) => setState(() => _category = val),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: const Color(0xFFCBD5E1)),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Copies: ',
                                    style: TextStyle(fontWeight: FontWeight.w600)),
                                IconButton(
                                  icon: const Icon(Icons.remove, size: 18),
                                  onPressed: _quantity > 1
                                      ? () => setState(() => _quantity--)
                                      : null,
                                ),
                                Text(
                                  '$_quantity',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                IconButton(
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
                            controller: _shelfLocationController,
                            decoration: const InputDecoration(
                              labelText: 'Shelf Location',
                              hintText: 'e.g. Shelf A-3',
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
                        for (final cond in ['Good', 'Fair', 'Poor'])
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
                      icon: const Icon(Icons.save_outlined),
                      label: const Text(
                        'Save & Scan Next',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      onPressed: _saveCurrentBook,
                    ),
                    if (_sessionScans.isNotEmpty) ...[
                      const SizedBox(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Session Scans (${_sessionScans.length})',
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          TextButton(
                            onPressed: _undoLastSave,
                            child: const Text('Undo Last'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _sessionScans.take(5).length,
                        itemBuilder: (ctx, idx) {
                          final item = _sessionScans[idx];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 6),
                            child: ListTile(
                              dense: true,
                              title: Text(item.title ?? 'Untitled',
                                  style: const TextStyle(fontWeight: FontWeight.w600)),
                              subtitle: Text(
                                '${item.author ?? "Unknown"} • ${item.quantity} copies (${item.condition})',
                              ),
                              trailing: item.shelfLocation != null
                                  ? Chip(
                                      label: Text(item.shelfLocation!),
                                      visualDensity: VisualDensity.compact,
                                    )
                                  : null,
                            ),
                          );
                        },
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
