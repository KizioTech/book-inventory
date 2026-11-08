import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/theme.dart';
import '../../data/remote/books_api.dart';
import '../../data/remote/schools_api.dart';
import '../../data/remote/supabase_client.dart';

const List<String> kTrackedFields = [
  'title',
  'author',
  'publisher',
  'isbn',
  'year',
  'category',
  'condition',
];

int completenessScore(Map<String, dynamic> b) {
  return kTrackedFields.where((f) {
    final v = b[f];
    return v != null && v.toString().trim().isNotEmpty;
  }).length;
}

class ResolveDuplicatesScreen extends ConsumerStatefulWidget {
  const ResolveDuplicatesScreen({super.key});

  @override
  ConsumerState<ResolveDuplicatesScreen> createState() =>
      _ResolveDuplicatesScreenState();
}

class _ResolveDuplicatesScreenState
    extends ConsumerState<ResolveDuplicatesScreen> {
  final _booksApi = BooksApi();
  final _schoolsApi = SchoolsApi();

  List<Map<String, dynamic>> _schools = [];
  List<Map<String, dynamic>> _duplicateGroups = [];
  String? _filterSchoolId;

  bool _loading = true;
  bool _mergingAll = false;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  Future<void> _loadInitialData() async {
    setState(() => _loading = true);
    try {
      final schools = await _schoolsApi.getSchools();
      if (mounted) {
        setState(() => _schools = schools);
      }
      await _loadDuplicateGroups();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load duplicate groups: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadDuplicateGroups() async {
    try {
      final groups = await _booksApi.getDuplicateGroups(_filterSchoolId);
      if (mounted) {
        setState(() => _duplicateGroups = groups);
      }
    } catch (e) {
      debugPrint('Error fetching duplicate groups: $e');
    }
  }

  Future<void> _handleMergeAll() async {
    if (_duplicateGroups.isEmpty) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Merge All Duplicate Groups?'),
        content: Text(
          'Are you sure you want to merge all ${_duplicateGroups.length} '
          'duplicate groups automatically?\n\n'
          'This will keep the most complete record for each ISBN, '
          'sum their quantities, and mark them as resolved. '
          'This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Merge All'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _mergingAll = true);
    int successCount = 0;
    int errorCount = 0;

    for (final group in _duplicateGroups) {
      try {
        final isbn = group['isbn'] as String?;
        final schoolId = group['school_id'] as String?;
        if (isbn == null || schoolId == null) continue;

        final res = await supabase
            .from('books')
            .select('*')
            .eq('isbn', isbn)
            .eq('school_id', schoolId)
            .order('created_at', ascending: true);

        final records = List<Map<String, dynamic>>.from(res);
        if (records.length < 2) continue;

        // Sort by completeness descending
        records.sort((a, b) => completenessScore(b).compareTo(completenessScore(a)));

        final master = records.first;
        final duplicates = records.sublist(1);
        final totalQty = records.fold<int>(
          0,
          (sum, r) => sum + ((r['quantity'] as num?)?.toInt() ?? 1),
        );

        // Update master
        await supabase.from('books').update({
          'quantity': totalQty,
          'flagged_as_duplicate': false,
        }).eq('id', master['id']);

        // Delete duplicates
        final dupIds = duplicates.map((d) => d['id'].toString()).toList();
        await supabase
            .from('books')
            .delete()
            .filter('id', 'in', '(${dupIds.join(",")})');

        successCount++;
      } catch (err) {
        debugPrint('Error merging group ${group["isbn"]}: $err');
        errorCount++;
      }
    }

    if (!mounted) return;
    setState(() => _mergingAll = false);
    await _loadDuplicateGroups();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Bulk merge complete. Merged $successCount groups successfully.'
          '${errorCount > 0 ? " ($errorCount errors occurred)" : ""}',
        ),
        backgroundColor:
            errorCount == 0 ? AppTheme.successColor : AppTheme.warningColor,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/admin');
            }
          },
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Review Duplicates'),
            Text(
              'Explore and merge book entries with the same ISBN',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.normal),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            icon: const Icon(Icons.refresh),
            onPressed: () {
              setState(() => _loading = true);
              _loadDuplicateGroups().whenComplete(() {
                if (mounted) setState(() => _loading = false);
              });
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter and Action Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: Colors.white,
            child: LayoutBuilder(
              builder: (context, constraints) {
                final isWide = constraints.maxWidth > 600;
                final dropdown = DropdownButtonFormField<String?>(
                  initialValue: _filterSchoolId,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'Filter School',
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                  items: [
                    const DropdownMenuItem(
                      value: null,
                      child: Text('All Schools'),
                    ),
                    for (final s in _schools)
                      DropdownMenuItem(
                        value: s['id'] as String,
                        child: Text(
                          s['name'] as String,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                  ],
                  onChanged: (val) {
                    setState(() {
                      _filterSchoolId = val;
                      _loading = true;
                    });
                    _loadDuplicateGroups().whenComplete(() {
                      if (mounted) setState(() => _loading = false);
                    });
                  },
                );

                final mergeAllButton = ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                  ),
                  icon: _mergingAll
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.call_merge, size: 18),
                  label: Text('Merge All (${_duplicateGroups.length} Groups)'),
                  onPressed: (_mergingAll || _duplicateGroups.isEmpty)
                      ? null
                      : _handleMergeAll,
                );

                if (isWide) {
                  return Row(
                    children: [
                      Expanded(child: dropdown),
                      const SizedBox(width: 16),
                      mergeAllButton,
                    ],
                  );
                } else {
                  return Column(
                    children: [
                      dropdown,
                      const SizedBox(height: 10),
                      SizedBox(width: double.infinity, child: mergeAllButton),
                    ],
                  );
                }
              },
            ),
          ),
          const Divider(height: 1),

          // Duplicate Groups Content
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _duplicateGroups.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(
                              Icons.check_circle_outline,
                              size: 56,
                              color: AppTheme.successColor,
                            ),
                            const SizedBox(height: 12),
                            const Text(
                              'No Duplicates Found',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              _filterSchoolId == null
                                  ? 'All clear! No books sharing the same ISBN were detected.'
                                  : 'No duplicate books found for this school.',
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppTheme.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _duplicateGroups.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 12),
                        itemBuilder: (ctx, idx) {
                          final group = _duplicateGroups[idx];
                          final schoolName = _schools.firstWhere(
                            (s) => s['id'] == group['school_id'],
                            orElse: () => {'name': 'Unknown School'},
                          )['name'];

                          return _DuplicateGroupCard(
                            group: group,
                            schoolName: schoolName,
                            onMerged: () {
                              _loadDuplicateGroups();
                            },
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}

class _DuplicateGroupCard extends StatefulWidget {
  final Map<String, dynamic> group;
  final String schoolName;
  final VoidCallback onMerged;

  const _DuplicateGroupCard({
    required this.group,
    required this.schoolName,
    required this.onMerged,
  });

  @override
  State<_DuplicateGroupCard> createState() => _DuplicateGroupCardState();
}

class _DuplicateGroupCardState extends State<_DuplicateGroupCard> {
  bool _expanded = false;
  List<Map<String, dynamic>> _records = [];
  bool _loadingRecords = false;
  bool _mergingGroup = false;

  Future<void> _fetchRecords() async {
    setState(() => _loadingRecords = true);
    try {
      final res = await supabase
          .from('books')
          .select('*')
          .eq('isbn', widget.group['isbn'])
          .eq('school_id', widget.group['school_id'])
          .order('created_at', ascending: true);

      if (mounted) {
        setState(() => _records = List<Map<String, dynamic>>.from(res));
      }
    } catch (e) {
      debugPrint('Error fetching group records: $e');
    } finally {
      if (mounted) setState(() => _loadingRecords = false);
    }
  }

  void _toggleExpand() {
    if (!_expanded && _records.isEmpty) {
      _fetchRecords();
    }
    setState(() => _expanded = !_expanded);
  }

  Future<void> _handleMergeGroup() async {
    if (_records.length < 2) return;
    setState(() => _mergingGroup = true);

    try {
      final sorted = [..._records]
        ..sort((a, b) => completenessScore(b).compareTo(completenessScore(a)));

      final master = sorted.first;
      final duplicates = sorted.sublist(1);
      final totalQty = sorted.fold<int>(
        0,
        (sum, r) => sum + ((r['quantity'] as num?)?.toInt() ?? 1),
      );

      // 1. Update master record
      await supabase.from('books').update({
        'quantity': totalQty,
        'flagged_as_duplicate': false,
      }).eq('id', master['id']);

      // 2. Delete duplicates
      final dupIds = duplicates.map((d) => d['id'].toString()).toList();
      await supabase
          .from('books')
          .delete()
          .filter('id', 'in', '(${dupIds.join(",")})');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Merged ${_records.length} records into 1.'),
            backgroundColor: AppTheme.successColor,
          ),
        );
        widget.onMerged();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Merge failed: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _mergingGroup = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final group = widget.group;
    final isbn = group['isbn'] ?? '';
    final title = group['title'] ?? 'Unknown Title';
    final author = group['author'] ?? 'Unknown Author';
    final count = group['duplicate_count'] ?? 0;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          // Header
          InkWell(
            onTap: _toggleExpand,
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      isbn,
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '$author • ${widget.schoolName}',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppTheme.textSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '$count Copies',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.warningColor,
                        ),
                      ),
                      const Text(
                        'TO MERGE',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    _expanded
                        ? Icons.keyboard_arrow_up
                        : Icons.keyboard_arrow_down,
                    color: AppTheme.textSecondary,
                  ),
                ],
              ),
            ),
          ),

          // Expanded Content
          if (_expanded) ...[
            const Divider(height: 1),
            Container(
              padding: const EdgeInsets.all(14),
              color: const Color(0xFFF8FAFC),
              child: _loadingRecords
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 20),
                        child: CircularProgressIndicator(),
                      ),
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Records Table / Cards
                        ..._buildRecordsList(),
                        const SizedBox(height: 14),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            OutlinedButton(
                              onPressed: _toggleExpand,
                              child: const Text('Cancel'),
                            ),
                            const SizedBox(width: 10),
                            ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppTheme.primaryColor,
                              ),
                              icon: _mergingGroup
                                  ? const SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : const Icon(Icons.call_merge, size: 16),
                              label: const Text('Merge Group Now'),
                              onPressed:
                                  _mergingGroup ? null : _handleMergeGroup,
                            ),
                          ],
                        ),
                      ],
                    ),
            ),
          ],
        ],
      ),
    );
  }

  List<Widget> _buildRecordsList() {
    final sorted = [..._records]
      ..sort((a, b) => completenessScore(b).compareTo(completenessScore(a)));

    return [
      for (var i = 0; i < sorted.length; i++) ...[
        () {
          final r = sorted[i];
          final isMaster = i == 0;
          final score = completenessScore(r);
          final rawDate = r['created_at'] != null
              ? DateTime.tryParse(r['created_at'].toString())
              : null;
          final dateStr = rawDate != null
              ? DateFormat('d MMM yyyy').format(rawDate)
              : 'Unknown date';
          final qty = r['quantity'] ?? 1;
          final condition = r['condition'] ?? '—';

          Color scoreColor = AppTheme.errorColor;
          if (score >= 6) {
            scoreColor = AppTheme.successColor;
          } else if (score >= 4) {
            scoreColor = AppTheme.warningColor;
          }

          return Container(
            margin: const EdgeInsets.only(bottom: 6),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: isMaster
                  ? AppTheme.primaryColor.withValues(alpha: 0.05)
                  : Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: isMaster
                    ? AppTheme.primaryColor.withValues(alpha: 0.3)
                    : const Color(0xFFE2E8F0),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: isMaster
                        ? AppTheme.primaryColor
                        : const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    isMaster ? 'MASTER' : 'COPY',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: isMaster ? Colors.white : AppTheme.textSecondary,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  dateStr,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondary,
                  ),
                ),
                const Spacer(),
                Text(
                  condition,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondary,
                  ),
                ),
                const SizedBox(width: 14),
                Text(
                  '$qty ${qty == 1 ? "copy" : "copies"}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(width: 14),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: scoreColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '$score/${kTrackedFields.length} fields',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: scoreColor,
                    ),
                  ),
                ),
              ],
            ),
          );
        }(),
      ],
    ];
  }
}
