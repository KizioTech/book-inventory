import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:file_picker/file_picker.dart';
import '../../core/theme.dart';
import '../../shared/utils/csv.dart';
import '../../data/local/app_database.dart';
import '../../data/remote/supabase_client.dart';
import '../../data/repositories/book_repository.dart';
import '../../data/repositories/school_repository.dart';
import '../../data/sync/sync_service.dart';
import '../../shared/widgets/book_widgets.dart';

class ClerkDashboardScreen extends ConsumerStatefulWidget {
  const ClerkDashboardScreen({super.key});

  @override
  ConsumerState<ClerkDashboardScreen> createState() => _ClerkDashboardScreenState();
}

class _ClerkDashboardScreenState extends ConsumerState<ClerkDashboardScreen> {
  final _searchController = TextEditingController();
  String _searchFilter = '';
  List<SchoolItem> _schools = [];
  bool _isLoadingSchools = true;

  @override
  void initState() {
    super.initState();
    _loadSchools();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadSchools() async {
    setState(() => _isLoadingSchools = true);
    final auth = ref.read(authStateProvider).value;
    if (auth?.user != null) {
      final schoolRepo = ref.read(schoolRepositoryProvider);
      final list = await schoolRepo.getSchoolsForUser(auth!.user!.id, auth.role);
      setState(() {
        _schools = list;
        _isLoadingSchools = false;
      });

      // Default active school if none selected
      if (ref.read(activeSchoolProvider) == null && list.isNotEmpty) {
        ref.read(activeSchoolProvider.notifier).select(list.first);
        ref.read(syncServiceProvider).pullBooksForSchool(list.first.id);
      }
    } else {
      setState(() => _isLoadingSchools = false);
    }
  }

  Future<void> _refreshAll() async {
    final school = ref.read(activeSchoolProvider);
    final sync = ref.read(syncServiceProvider);
    await sync.flush();
    if (school != null) await sync.pullBooksForSchool(school.id);
  }

  String _failedItemTitle(OutboxData item) {
    try {
      final m = jsonDecode(item.payload) as Map<String, dynamic>;
      final t = (m['title'] ?? '').toString().trim();
      if (t.isNotEmpty) return t;
    } catch (_) {}
    final id = item.entityId;
    return 'Record #${id.length > 8 ? id.substring(0, 8) : id}…';
  }

  Future<void> _exportCsv(List<BookRecord> books) async {
    if (books.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No records to export.')),
      );
      return;
    }

    final activeSchool = ref.read(activeSchoolProvider);
    final schoolName = activeSchool?.name.replaceAll(' ', '_') ?? 'School';
    final fileName = '${schoolName}_Inventory_${DateTime.now().millisecondsSinceEpoch}.csv';

    final records = books.map((b) {
      return {
        'title': b.title,
        'author': b.author,
        'author_2': b.author2,
        'author_3': b.author3,
        'author_4': b.author4,
        'author_5': b.author5,
        'isbn': b.isbn,
        'publisher': b.publisher,
        'year': b.year,
        'category': b.category,
        'quantity': b.quantity,
        'condition': b.condition,
        'shelf_location': b.shelfLocation,
        'notes': b.notes,
      };
    }).toList();

    final csvText = CsvUtils.exportToCsv(records);

    if (!kIsWeb && Platform.isAndroid) {
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/$fileName');
      await file.writeAsString(csvText);
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(file.path)],
          text: 'Book Inventory Export',
        ),
      );
    } else {
      final uri = await FilePicker.saveFile(
        fileName: fileName,
        bytes: Uint8List.fromList(utf8.encode(csvText)),
        dialogTitle: 'Save Inventory CSV',
      );

      if (uri != null && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Saved CSV to ${uri.path}'),
            backgroundColor: AppTheme.successColor,
          ),
        );
      }
    }
  }

  void _showRecoveryDialog() async {
    final bookRepo = ref.read(bookRepositoryProvider);
    final failedItems = await bookRepo.getFailedSyncItems();

    if (!mounted) return;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.sync_problem_rounded, color: AppTheme.errorColor),
            const SizedBox(width: 8),
            Text('Failed Sync Items (${failedItems.length})'),
          ],
        ),
        content: SizedBox(
          width: 500,
          child: failedItems.isEmpty
              ? const Text('All items synced successfully.')
              : ListView.separated(
                  shrinkWrap: true,
                  itemCount: failedItems.length,
                  separatorBuilder: (_, _) => const Divider(),
                  itemBuilder: (ctx, idx) {
                    final item = failedItems[idx];
                    return ListTile(
                      dense: true,
                      title: Text(_failedItemTitle(item)),
                      subtitle: Text(
                        '${item.op == "delete" ? "Delete failed: " : ""}${item.lastError ?? "Unknown error"}',
                        style: const TextStyle(color: AppTheme.errorColor, fontSize: 12),
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.refresh, color: AppTheme.primaryLight),
                            tooltip: 'Retry',
                            onPressed: () async {
                              await bookRepo.retryFailedItem(item.seq);
                              if (ctx.mounted) Navigator.of(ctx).pop();
                              _showRecoveryDialog();
                            },
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline, color: AppTheme.errorColor),
                            tooltip: 'Discard',
                            onPressed: () async {
                              await bookRepo.discardFailedItem(item.seq);
                              if (ctx.mounted) Navigator.of(ctx).pop();
                              _showRecoveryDialog();
                            },
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final activeSchool = ref.watch(activeSchoolProvider);
    final booksAsync = ref.watch(schoolBooksStreamProvider);
    final syncService = ref.watch(syncServiceProvider);
    final auth = ref.watch(authStateProvider).value;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Clerk Dashboard'),
        actions: [
          ValueListenableBuilder<bool>(
            valueListenable: syncService.isSyncing,
            builder: (ctx, isSyncing, _) {
              return IconButton(
                tooltip: 'Sync with Cloud',
                icon: isSyncing
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.cloud_sync_outlined),
                onPressed: isSyncing
                    ? null
                    : () async {
                        await syncService.flush();
                        if (activeSchool != null) {
                          await syncService.pullBooksForSchool(activeSchool.id);
                        }
                      },
              );
            },
          ),
          IconButton(
            tooltip: 'Sync Recovery',
            icon: const Icon(Icons.sync_problem_outlined),
            onPressed: _showRecoveryDialog,
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.account_circle_outlined),
            onSelected: (val) async {
              if (val == 'account') {
                context.push('/account');
              } else if (val == 'logout') {
                await supabase.auth.signOut();
                if (context.mounted) {
                  context.go('/auth');
                }
              }
            },
            itemBuilder: (ctx) => [
              PopupMenuItem(
                enabled: false,
                child: Text(auth?.user?.email ?? 'User'),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem(
                value: 'account',
                child: Row(
                  children: [
                    Icon(Icons.manage_accounts_outlined, size: 18),
                    SizedBox(width: 8),
                    Text('Account Settings'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout, size: 18),
                    SizedBox(width: 8),
                    Text('Sign Out'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              color: Colors.white,
              child: Row(
                children: [
                  Expanded(
                    child: _isLoadingSchools
                        ? const LinearProgressIndicator()
                        : DropdownButtonFormField<SchoolItem>(
                            initialValue: activeSchool,
                            isExpanded: true,
                            decoration: const InputDecoration(
                              labelText: 'Active School',
                              contentPadding:
                                  EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            ),
                            items: _schools.map((s) {
                              return DropdownMenuItem(
                                value: s,
                                child: Text(
                                  s.name,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontWeight: FontWeight.w600),
                                ),
                              );
                            }).toList(),
                            onChanged: (sel) {
                              if (sel != null) {
                                ref.read(activeSchoolProvider.notifier).select(sel);
                                syncService.pullBooksForSchool(sel.id);
                              }
                            },
                          ),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton.icon(
                    icon: const Icon(Icons.qr_code_scanner, size: 18),
                    label: const Text('Scan'),
                    onPressed: () => context.go('/scan'),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            booksAsync.maybeWhen(
              data: (books) => _buildSummary(books, auth),
              orElse: () => const SizedBox.shrink(),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      decoration: InputDecoration(
                        hintText: 'Search records by title, author, or ISBN...',
                        prefixIcon: const Icon(Icons.search, size: 20),
                        contentPadding: const EdgeInsets.symmetric(vertical: 10),
                        suffixIcon: _searchFilter.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear, size: 18),
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() => _searchFilter = '');
                                },
                              )
                            : null,
                      ),
                      onChanged: (val) {
                        setState(() => _searchFilter = val.trim().toLowerCase());
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  booksAsync.maybeWhen(
                    data: (books) => OutlinedButton.icon(
                      icon: const Icon(Icons.download_rounded, size: 18),
                      label: const Text('Export CSV'),
                      onPressed: () => _exportCsv(books),
                    ),
                    orElse: () => const SizedBox.shrink(),
                  ),
                ],
              ),
            ),
            Expanded(
              child: booksAsync.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, _) => Center(child: Text('Error loading books: $err')),
                data: (books) {
                  final filtered = books.where((b) {
                    if (_searchFilter.isEmpty) return true;
                    final title = b.title?.toLowerCase() ?? '';
                    final author = b.authorsDisplay.toLowerCase();
                    final isbn = b.isbn?.toLowerCase() ?? '';
                    return title.contains(_searchFilter) ||
                        author.contains(_searchFilter) ||
                        isbn.contains(_searchFilter);
                  }).toList();

                  if (filtered.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.inventory_2_outlined,
                              size: 54,
                              color: AppTheme.textSecondary.withValues(alpha: 0.4)),
                          const SizedBox(height: 12),
                          const Text(
                            'No book records found',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'Tap Scan to start collecting books for this school.',
                            style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                          ),
                        ],
                      ),
                    );
                  }

                  return RefreshIndicator(
                    onRefresh: _refreshAll,
                    child: ListView.separated(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 88),
                      itemCount: filtered.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 8),
                      itemBuilder: (ctx, idx) => _buildBookCard(filtered[idx]),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        icon: const Icon(Icons.qr_code_scanner),
        label: const Text('Start Scanning'),
        onPressed: () => context.go('/scan'),
      ),
    );
  }

  Widget _buildSummary(List<BookRecord> books, AuthStateData? auth) {
    final myId = auth?.user?.id;
    final mine = books.where((b) => b.clerkId == myId).toList();
    final now = DateTime.now();
    final today = mine.where((b) {
      final d = b.updatedAt;
      return d.year == now.year && d.month == now.month && d.day == now.day;
    }).length;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Row(
        children: [
          Expanded(
            child: _buildStatCard(
                Icons.menu_book_outlined, 'My scans', '${mine.length}'),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _buildStatCard(Icons.today_outlined, 'Today', '$today'),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: _buildStatCard(
                Icons.school_outlined, 'Schools', '${_schools.length}'),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(IconData icon, String label, String value) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withValues(alpha: 0.08),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 18, color: AppTheme.primaryColor),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    value,
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 11, color: AppTheme.textSecondary),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBookCard(BookRecord item) {
    final authors = item.authorsDisplay;
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => showBookDetailSheet(
          context,
          item,
          onEdit: () => showEditBookDialog(context, item),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 4, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      item.title ?? 'Untitled Book',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                  ),
                  _buildSyncBadge(item.syncState),
                  PopupMenuButton<String>(
                    padding: EdgeInsets.zero,
                    icon: const Icon(Icons.more_vert, size: 20),
                    onSelected: (v) async {
                      if (v == 'details') {
                        await showBookDetailSheet(
                          context,
                          item,
                          onEdit: () => showEditBookDialog(context, item),
                        );
                      } else if (v == 'edit') {
                        await showEditBookDialog(context, item);
                      } else if (v == 'delete') {
                        await deleteBookWithConfirm(context, ref, item);
                      }
                    },
                    itemBuilder: (ctx) => const [
                      PopupMenuItem(value: 'details', child: Text('View details')),
                      PopupMenuItem(value: 'edit', child: Text('Edit')),
                      PopupMenuItem(value: 'delete', child: Text('Delete')),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 2),
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: Text(
                  '${authors.isEmpty ? "Unknown Author" : authors}'
                  '${item.year != null && item.year!.isNotEmpty ? " (${item.year})" : ""}',
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  if (item.isbn != null && item.isbn!.isNotEmpty)
                    _buildInfoChip(Icons.qr_code, item.isbn!),
                  _buildInfoChip(
                    Icons.copy_rounded,
                    '${item.quantity} ${item.quantity == 1 ? "copy" : "copies"}',
                  ),
                  _buildInfoChip(
                    Icons.auto_awesome,
                    item.condition ?? 'Good',
                  ),
                  if (item.category != null && item.category!.isNotEmpty)
                    _buildInfoChip(Icons.label_outline, item.category!),
                  if (item.shelfLocation != null &&
                      item.shelfLocation!.isNotEmpty)
                    _buildInfoChip(Icons.shelves, item.shelfLocation!),
                  if (item.flaggedAsDuplicate)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: AppTheme.warningColor.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        'Duplicate',
                        style: TextStyle(
                          fontSize: 11,
                          color: AppTheme.warningColor,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSyncBadge(String state) {
    Color color;
    IconData icon;
    String label;

    switch (state) {
      case 'synced':
        color = AppTheme.successColor;
        icon = Icons.check_circle_outline;
        label = 'Synced';
        break;
      case 'failed':
        color = AppTheme.errorColor;
        icon = Icons.error_outline;
        label = 'Failed';
        break;
      default:
        color = AppTheme.warningColor;
        icon = Icons.schedule;
        label = 'Pending';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoChip(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: AppTheme.textSecondary),
          const SizedBox(width: 4),
          Text(
            text,
            style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
          ),
        ],
      ),
    );
  }
}
