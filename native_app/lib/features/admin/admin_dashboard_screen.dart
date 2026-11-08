import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:file_picker/file_picker.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../shared/utils/csv.dart';
import '../../data/remote/admin_api.dart';
import '../../data/remote/books_api.dart';
import '../../data/remote/schools_api.dart';
import '../../data/remote/supabase_client.dart';

class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen> {
  int _selectedIndex = 0;
  final _adminApi = AdminApi();
  final _schoolsApi = SchoolsApi();
  final _booksApi = BooksApi();

  // Schools state
  List<Map<String, dynamic>> _schools = [];
  bool _isLoadingSchools = true;

  // Users state
  List<Map<String, dynamic>> _users = [];
  bool _isLoadingUsers = true;

  // Duplicates state
  List<Map<String, dynamic>> _duplicates = [];
  bool _isLoadingDuplicates = true;

  // Analytics state
  List<Map<String, dynamic>> _schoolStats = [];
  bool _isLoadingStats = true;

  // Explore state
  List<Map<String, dynamic>> _exploreBooks = [];
  String? _selectedExploreSchoolId;
  String? _selectedExploreCategory;
  final _exploreSearchController = TextEditingController();
  bool _isLoadingExplore = false;

  // Catalogue / Shared Metadata state
  List<Map<String, dynamic>> _catalogueResults = [];
  final _catalogueSearchController = TextEditingController();
  bool _isSearchingCatalogue = false;
  bool _isImportingCatalogue = false;
  double? _importProgress;
  int _totalCatalogueCount = 0;

  @override
  void initState() {
    super.initState();
    _loadAllData();
  }

  @override
  void dispose() {
    _exploreSearchController.dispose();
    _catalogueSearchController.dispose();
    super.dispose();
  }

  Future<void> _loadAllData() async {
    _loadSchools();
    _loadUsers();
    _loadDuplicates();
    _loadStats();
    _loadCatalogueCount();
  }

  Future<void> _loadSchools() async {
    setState(() => _isLoadingSchools = true);
    try {
      final res = await _schoolsApi.getSchools();
      if (mounted) setState(() => _schools = res);
    } catch (_) {}
    if (mounted) setState(() => _isLoadingSchools = false);
  }

  Future<void> _loadUsers() async {
    setState(() => _isLoadingUsers = true);
    try {
      final res = await _adminApi.getUsers();
      if (mounted) setState(() => _users = res);
    } catch (_) {}
    if (mounted) setState(() => _isLoadingUsers = false);
  }

  Future<void> _loadDuplicates() async {
    setState(() => _isLoadingDuplicates = true);
    try {
      final res = await _booksApi.getDuplicateGroups();
      if (mounted) setState(() => _duplicates = res);
    } catch (_) {}
    if (mounted) setState(() => _isLoadingDuplicates = false);
  }

  Future<void> _loadStats() async {
    setState(() => _isLoadingStats = true);
    try {
      final res = await _booksApi.getSchoolStats();
      if (mounted) setState(() => _schoolStats = res);
    } catch (_) {}
    if (mounted) setState(() => _isLoadingStats = false);
  }

  Future<void> _loadExploreBooks(String schoolId, [String? search]) async {
    setState(() => _isLoadingExplore = true);
    try {
      final res = await _booksApi.fetchBooksForSchool(
        schoolId,
        limit: 100,
        search: search,
      );
      if (mounted) setState(() => _exploreBooks = res);
    } catch (_) {}
    if (mounted) setState(() => _isLoadingExplore = false);
  }

  // Add School Dialog
  void _showAddSchoolDialog() {
    final nameCtrl = TextEditingController();
    final districtCtrl = TextEditingController();
    final regionCtrl = TextEditingController();
    final contactCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add New School'),
        content: SizedBox(
          width: 400,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(labelText: 'School Name *'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: districtCtrl,
                decoration: const InputDecoration(labelText: 'District'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: regionCtrl,
                decoration: const InputDecoration(labelText: 'Region'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: contactCtrl,
                decoration: const InputDecoration(labelText: 'Contact Info'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (nameCtrl.text.trim().isEmpty) return;
              await _schoolsApi.createSchool({
                'name': nameCtrl.text.trim(),
                'district': districtCtrl.text.trim().isEmpty ? null : districtCtrl.text.trim(),
                'region': regionCtrl.text.trim().isEmpty ? null : regionCtrl.text.trim(),
                'contact': contactCtrl.text.trim().isEmpty ? null : contactCtrl.text.trim(),
                'active': true,
              });
              if (ctx.mounted) {
                Navigator.of(ctx).pop();
                _loadSchools();
              }
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }

  // Edit School Dialog
  void _showEditSchoolDialog(Map<String, dynamic> school) {
    final nameCtrl = TextEditingController(text: school['name'] ?? '');
    final districtCtrl = TextEditingController(text: school['district'] ?? '');
    final regionCtrl = TextEditingController(text: school['region'] ?? '');
    final contactCtrl = TextEditingController(text: school['contact'] ?? '');
    bool isActive = school['active'] ?? true;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Edit School'),
          content: SizedBox(
            width: 400,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(labelText: 'School Name *'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: districtCtrl,
                    decoration: const InputDecoration(labelText: 'District'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: regionCtrl,
                    decoration: const InputDecoration(labelText: 'Region'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: contactCtrl,
                    decoration: const InputDecoration(labelText: 'Contact Info'),
                  ),
                  const SizedBox(height: 16),
                  SwitchListTile(
                    title: const Text('Active Status'),
                    subtitle: Text(isActive ? 'Accepting inventory scans' : 'Paused / Inactive'),
                    value: isActive,
                    onChanged: (val) => setDialogState(() => isActive = val),
                    contentPadding: EdgeInsets.zero,
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (nameCtrl.text.trim().isEmpty) return;
                try {
                  await _schoolsApi.updateSchool(school['id'] as String, {
                    'name': nameCtrl.text.trim(),
                    'district': districtCtrl.text.trim().isEmpty ? null : districtCtrl.text.trim(),
                    'region': regionCtrl.text.trim().isEmpty ? null : regionCtrl.text.trim(),
                    'contact': contactCtrl.text.trim().isEmpty ? null : contactCtrl.text.trim(),
                    'active': isActive,
                  });
                  if (ctx.mounted) {
                    Navigator.of(ctx).pop();
                    _loadSchools();
                  }
                } catch (e) {
                  if (ctx.mounted) {
                    ScaffoldMessenger.of(ctx).showSnackBar(
                      SnackBar(content: Text('Failed to update school: $e')),
                    );
                  }
                }
              },
              child: const Text('Save Changes'),
            ),
          ],
        ),
      ),
    );
  }

  // Add User Dialog (calling Edge Function create-user)
  void _showAddUserDialog() {
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final passwordCtrl = TextEditingController();
    String role = 'clerk';
    List<String> selectedSchoolIds = [];

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Create New User'),
          content: SizedBox(
            width: 450,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: nameCtrl,
                    decoration: const InputDecoration(labelText: 'Full Name *'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: emailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(labelText: 'Email Address *'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: passwordCtrl,
                    obscureText: true,
                    decoration: const InputDecoration(
                      labelText: 'Password',
                      hintText: 'Leave empty to send email invite',
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text('Role', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'clerk', label: Text('Clerk (Collector)')),
                      ButtonSegment(value: 'admin', label: Text('Admin (Manager)')),
                    ],
                    selected: {role},
                    onSelectionChanged: (set) {
                      setDialogState(() => role = set.first);
                    },
                  ),
                  const SizedBox(height: 12),
                  if (role == 'clerk') ...[
                    const Text('Assign Schools', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Container(
                      height: 150,
                      decoration: BoxDecoration(
                        border: Border.all(color: const Color(0xFFCBD5E1)),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: ListView.builder(
                        itemCount: _schools.length,
                        itemBuilder: (ctx, idx) {
                          final s = _schools[idx];
                          final id = s['id'] as String;
                          final isSelected = selectedSchoolIds.contains(id);
                          return CheckboxListTile(
                            dense: true,
                            title: Text(s['name'] ?? ''),
                            value: isSelected,
                            onChanged: (checked) {
                              setDialogState(() {
                                if (checked == true) {
                                  selectedSchoolIds.add(id);
                                } else {
                                  selectedSchoolIds.remove(id);
                                }
                              });
                            },
                          );
                        },
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (nameCtrl.text.trim().isEmpty || emailCtrl.text.trim().isEmpty) return;
                try {
                  await _adminApi.createUser(
                    fullName: nameCtrl.text.trim(),
                    email: emailCtrl.text.trim(),
                    password: passwordCtrl.text.trim().isEmpty ? null : passwordCtrl.text.trim(),
                    role: role,
                    schoolIds: role == 'clerk' ? selectedSchoolIds : null,
                  );
                  if (ctx.mounted) {
                    Navigator.of(ctx).pop();
                    _loadUsers();
                  }
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('User created successfully!'),
                        backgroundColor: AppTheme.successColor,
                      ),
                    );
                  }
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Error: $e'), backgroundColor: AppTheme.errorColor),
                    );
                  }
                }
              },
              child: const Text('Create User'),
            ),
          ],
        ),
      ),
    );
  }

  // Edit User Dialog (calling Edge Function update-user)
  void _showEditUserDialog(Map<String, dynamic> user) {
    final roles = (user['user_roles'] as List?)
            ?.map((r) => r['role'].toString())
            .toList() ??
        [];
    String currentRole = roles.contains('admin') ? 'admin' : 'clerk';

    final clerkSchools = (user['clerk_schools'] as List?)
            ?.map((cs) => cs['school_id'].toString())
            .toList() ??
        [];
    List<String> selectedSchoolIds = List.from(clerkSchools);

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text('Edit User: ${user["full_name"] ?? user["email"]}'),
          content: SizedBox(
            width: 450,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Email: ${user["email"] ?? "N/A"}',
                      style: const TextStyle(color: AppTheme.textSecondary)),
                  const SizedBox(height: 16),
                  const Text('Role', style: TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'clerk', label: Text('Clerk (Collector)')),
                      ButtonSegment(value: 'admin', label: Text('Admin (Manager)')),
                    ],
                    selected: {currentRole},
                    onSelectionChanged: (set) {
                      setDialogState(() => currentRole = set.first);
                    },
                  ),
                  const SizedBox(height: 16),
                  if (currentRole == 'clerk') ...[
                    const Text('Assigned Schools',
                        style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Container(
                      height: 180,
                      decoration: BoxDecoration(
                        border: Border.all(color: const Color(0xFFCBD5E1)),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: ListView.builder(
                        itemCount: _schools.length,
                        itemBuilder: (ctx, idx) {
                          final s = _schools[idx];
                          final id = s['id'] as String;
                          final isSelected = selectedSchoolIds.contains(id);
                          return CheckboxListTile(
                            dense: true,
                            title: Text(s['name'] ?? ''),
                            subtitle: s['district'] != null ? Text(s['district']) : null,
                            value: isSelected,
                            onChanged: (checked) {
                              setDialogState(() {
                                if (checked == true) {
                                  selectedSchoolIds.add(id);
                                } else {
                                  selectedSchoolIds.remove(id);
                                }
                              });
                            },
                          );
                        },
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                try {
                  await _adminApi.updateUser(
                    userId: user['id'] as String,
                    role: currentRole,
                    schoolIds: currentRole == 'clerk' ? selectedSchoolIds : null,
                  );
                  if (ctx.mounted) {
                    Navigator.of(ctx).pop();
                    _loadUsers();
                  }
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('User updated successfully!'),
                        backgroundColor: AppTheme.successColor,
                      ),
                    );
                  }
                } catch (e) {
                  if (ctx.mounted) {
                    ScaffoldMessenger.of(ctx).showSnackBar(
                      SnackBar(content: Text('Failed to update user: $e')),
                    );
                  }
                }
              },
              child: const Text('Save Changes'),
            ),
          ],
        ),
      ),
    );
  }

  // Catalogue Management
  Future<void> _loadCatalogueCount() async {
    try {
      final res = await supabase.from('book_metadata').select('isbn');
      if (mounted) {
        setState(() => _totalCatalogueCount = (res as List).length);
      }
    } catch (_) {}
  }

  Future<void> _searchCatalogue(String query) async {
    if (query.trim().length < 2) {
      setState(() => _catalogueResults = []);
      return;
    }
    setState(() => _isSearchingCatalogue = true);
    try {
      final results = await _booksApi.searchMetadataByTitle(query.trim(), limit: 50);
      if (mounted) setState(() => _catalogueResults = results);
    } catch (_) {}
    if (mounted) setState(() => _isSearchingCatalogue = false);
  }

  Future<void> _importCatalogueCsv() async {
    final file = await FilePicker.pickFile(
      type: FileType.custom,
      allowedExtensions: ['csv'],
    );
    if (file == null) return;

    final bytes = await file.readAsBytes();
    final csvString = utf8.decode(bytes);
    final parsed = CsvUtils.parseCsv(csvString);
    if (parsed.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No valid rows found in selected CSV.')),
        );
      }
      return;
    }

    setState(() {
      _isImportingCatalogue = true;
      _importProgress = 0.0;
    });

    final total = parsed.length;
    int processed = 0;
    const batchSize = 50;

    for (var i = 0; i < total; i += batchSize) {
      final chunk = parsed.sublist(i, (i + batchSize > total) ? total : i + batchSize);
      final batchPayload = chunk.map((r) {
        final rawIsbn = (r['isbn'] ?? '')
            .toString()
            .replaceAll(RegExp(r'[^0-9Xx]'), '')
            .trim();
        final isbn = rawIsbn.isNotEmpty ? rawIsbn : null;
        final rawAuthor = (r['author'] ?? '').toString();
        final authors = rawAuthor
            .split(RegExp(r'[,;]'))
            .map((a) => a.trim())
            .where((a) => a.isNotEmpty)
            .toList();

        return {
          ?isbn: isbn,
          'title': r['book_title'] ?? r['title'] ?? '',
          'author': authors.isNotEmpty ? authors[0] : (r['author'] ?? ''),
          'author_2': authors.length > 1 ? authors[1] : r['author_2'],
          'author_3': authors.length > 2 ? authors[2] : r['author_3'],
          'author_4': authors.length > 3 ? authors[3] : r['author_4'],
          'author_5': authors.length > 4 ? authors[4] : r['author_5'],
          'publisher': r['publisher'] ?? r['publisher_name'],
          'year': r['year_published'] ?? r['year'] ?? r['copyright_year'],
          'category': r['category_name'] ?? r['category'],
        };
      }).where((m) => (m['title'] as String).isNotEmpty && m['isbn'] != null).toList();

      if (batchPayload.isNotEmpty) {
        try {
          await supabase.from('book_metadata').upsert(batchPayload, onConflict: 'isbn');
        } catch (e) {
          debugPrint('Batch upsert error: $e');
        }
      }

      processed += chunk.length;
      if (mounted) {
        setState(() => _importProgress = processed / total);
      }
    }

    if (mounted) {
      setState(() {
        _isImportingCatalogue = false;
        _importProgress = null;
      });
      _loadCatalogueCount();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Catalogue import complete! Processed $total rows.'),
          backgroundColor: AppTheme.successColor,
        ),
      );
    }
  }

  Future<void> _exportSchoolInventory(String schoolId, String schoolName) async {
    final books = await _booksApi.fetchBooksForSchool(schoolId, limit: 10000);
    final fileName = '${schoolName.replaceAll(" ", "_")}_Inventory.csv';
    final csvText = CsvUtils.exportToCsv(books);

    final uri = await FilePicker.saveFile(
      fileName: fileName,
      bytes: Uint8List.fromList(utf8.encode(csvText)),
      dialogTitle: 'Save Inventory CSV',
    );

    if (uri != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Exported CSV to ${uri.path}'),
          backgroundColor: AppTheme.successColor,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDesktop = MediaQuery.of(context).size.width >= 800;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Manager Admin Portal'),
        actions: [
          IconButton(
            tooltip: 'Refresh All',
            icon: const Icon(Icons.refresh),
            onPressed: _loadAllData,
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
              const PopupMenuItem(
                  value: 'account', child: Text('Account Settings')),
              const PopupMenuItem(value: 'logout', child: Text('Sign Out')),
            ],
          ),
        ],
      ),
      body: Row(
        children: [
          if (isDesktop)
            NavigationRail(
              selectedIndex: _selectedIndex,
              onDestinationSelected: (idx) => setState(() => _selectedIndex = idx),
              labelType: NavigationRailLabelType.all,
              leading: Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Image.asset(
                    'assets/blue-logo.png',
                    width: 44,
                    height: 44,
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              destinations: const [
                NavigationRailDestination(
                  icon: Icon(Icons.analytics_outlined),
                  selectedIcon: Icon(Icons.analytics),
                  label: Text('Analytics'),
                ),
                NavigationRailDestination(
                  icon: Icon(Icons.school_outlined),
                  selectedIcon: Icon(Icons.school),
                  label: Text('Schools'),
                ),
                NavigationRailDestination(
                  icon: Icon(Icons.people_outline),
                  selectedIcon: Icon(Icons.people),
                  label: Text('Users'),
                ),
                NavigationRailDestination(
                  icon: Icon(Icons.manage_search_outlined),
                  selectedIcon: Icon(Icons.manage_search),
                  label: Text('Explore'),
                ),
                NavigationRailDestination(
                  icon: Icon(Icons.copy_all_outlined),
                  selectedIcon: Icon(Icons.copy_all),
                  label: Text('Duplicates'),
                ),
                NavigationRailDestination(
                  icon: Icon(Icons.auto_stories_outlined),
                  selectedIcon: Icon(Icons.auto_stories),
                  label: Text('Catalogue'),
                ),
              ],
            ),
          const VerticalDivider(thickness: 1, width: 1),
          Expanded(
            child: _buildCurrentTab(),
          ),
        ],
      ),
      bottomNavigationBar: !isDesktop
          ? BottomNavigationBar(
              currentIndex: _selectedIndex,
              onTap: (idx) => setState(() => _selectedIndex = idx),
              type: BottomNavigationBarType.fixed,
              items: const [
                BottomNavigationBarItem(icon: Icon(Icons.analytics), label: 'Analytics'),
                BottomNavigationBarItem(icon: Icon(Icons.school), label: 'Schools'),
                BottomNavigationBarItem(icon: Icon(Icons.people), label: 'Users'),
                BottomNavigationBarItem(icon: Icon(Icons.manage_search), label: 'Explore'),
                BottomNavigationBarItem(icon: Icon(Icons.copy_all), label: 'Duplicates'),
                BottomNavigationBarItem(icon: Icon(Icons.auto_stories), label: 'Catalogue'),
              ],
            )
          : null,
    );
  }

  Widget _buildCurrentTab() {
    switch (_selectedIndex) {
      case 0:
        return _buildAnalyticsTab();
      case 1:
        return _buildSchoolsTab();
      case 2:
        return _buildUsersTab();
      case 3:
        return _buildExploreTab();
      case 4:
        return _buildDuplicatesTab();
      case 5:
        return _buildCatalogueTab();
      default:
        return const SizedBox.shrink();
    }
  }

  // Analytics Tab
  Widget _buildAnalyticsTab() {
    if (_isLoadingStats) {
      return const Center(child: CircularProgressIndicator());
    }

    final totalBooksCount = _schoolStats.fold<int>(
      0,
      (sum, s) => sum + ((s['total_books'] as num?)?.toInt() ?? 0),
    );

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Inventory Overview',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          // Metric Cards
          Row(
            children: [
              _buildStatCard(
                'Total Books Collected',
                '$totalBooksCount',
                Icons.book_rounded,
                AppTheme.primaryColor,
              ),
              const SizedBox(width: 16),
              _buildStatCard(
                'Active Schools',
                '${_schools.length}',
                Icons.school_rounded,
                AppTheme.secondaryColor,
              ),
              const SizedBox(width: 16),
              _buildStatCard(
                'Data Collectors',
                '${_users.where((u) => (u["user_roles"] as List?)?.any((r) => r["role"] == "clerk") ?? false).length}',
                Icons.badge_rounded,
                AppTheme.warningColor,
              ),
            ],
          ),
          const SizedBox(height: 28),
          const Text(
            'Books by School',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          // Bar Chart
          SizedBox(
            height: 260,
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: _schoolStats.isEmpty
                    ? const Center(child: Text('No stats available yet.'))
                    : BarChart(
                        BarChartData(
                          alignment: BarChartAlignment.spaceAround,
                          maxY: (_schoolStats
                                      .map((s) => (s['total_books'] as num?)?.toDouble() ?? 0)
                                      .fold(0.0, (a, b) => a > b ? a : b) *
                                  1.2)
                              .clamp(10, 100000),
                          barGroups: [
                            for (var i = 0; i < _schoolStats.length && i < 7; i++)
                              BarChartGroupData(
                                x: i,
                                barRods: [
                                  BarChartRodData(
                                    toY: ((_schoolStats[i]['total_books'] as num?)?.toDouble() ?? 0),
                                    color: AppTheme.primaryLight,
                                    width: 22,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                ],
                              ),
                          ],
                          titlesData: FlTitlesData(
                            leftTitles: const AxisTitles(
                              sideTitles: SideTitles(showTitles: true, reservedSize: 36),
                            ),
                            bottomTitles: AxisTitles(
                              sideTitles: SideTitles(
                                showTitles: true,
                                getTitlesWidget: (val, meta) {
                                  final idx = val.toInt();
                                  if (idx >= 0 && idx < _schoolStats.length) {
                                    final sId = _schoolStats[idx]['school_id'];
                                    final s = _schools.firstWhere(
                                      (e) => e['id'] == sId,
                                      orElse: () => {'name': '#$idx'},
                                    );
                                    return Text(
                                      (s['name'] as String?)?.split(' ').first ?? '',
                                      style: const TextStyle(fontSize: 11),
                                    );
                                  }
                                  return const Text('');
                                },
                              ),
                            ),
                            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          ),
                          gridData: const FlGridData(show: true, drawVerticalLine: false),
                          borderData: FlBorderData(show: false),
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 28),
              ),
              const SizedBox(width: 16),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    value,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Schools Tab
  Widget _buildSchoolsTab() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Schools',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              ElevatedButton.icon(
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Add School'),
                onPressed: _showAddSchoolDialog,
              ),
            ],
          ),
          const SizedBox(height: 16),
          Expanded(
            child: _isLoadingSchools
                ? const Center(child: CircularProgressIndicator())
                : ListView.separated(
                    itemCount: _schools.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (ctx, idx) {
                      final s = _schools[idx];
                      final isActive = s['active'] ?? true;
                      return Card(
                        child: ListTile(
                          title: Text(
                            s['name'] ?? '',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Text(
                            '${s["district"] ?? "No district"} • ${s["region"] ?? "No region"}',
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Chip(
                                label: Text(isActive ? 'Active' : 'Paused'),
                                backgroundColor: isActive
                                    ? AppTheme.successColor.withValues(alpha: 0.15)
                                    : AppTheme.warningColor.withValues(alpha: 0.15),
                                labelStyle: TextStyle(
                                  color: isActive
                                      ? AppTheme.successColor
                                      : AppTheme.warningColor,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                              const SizedBox(width: 8),
                              IconButton(
                                icon: const Icon(Icons.edit_outlined),
                                tooltip: 'Edit School',
                                onPressed: () => _showEditSchoolDialog(s),
                              ),
                              IconButton(
                                icon: const Icon(Icons.download_rounded),
                                tooltip: 'Export School CSV',
                                onPressed: () =>
                                    _exportSchoolInventory(s['id'], s['name'] ?? 'School'),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  // Users Tab
  Widget _buildUsersTab() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'User Management',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              ElevatedButton.icon(
                icon: const Icon(Icons.person_add_alt_1, size: 18),
                label: const Text('Add User'),
                onPressed: _showAddUserDialog,
              ),
            ],
          ),
          const SizedBox(height: 16),
          Expanded(
            child: _isLoadingUsers
                ? const Center(child: CircularProgressIndicator())
                : ListView.separated(
                    itemCount: _users.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (ctx, idx) {
                      final u = _users[idx];
                      final roles = (u['user_roles'] as List?)
                              ?.map((r) => r['role'].toString())
                              .toList() ??
                          [];
                      final roleStr = roles.join(', ');
                      final clerkSchools = (u['clerk_schools'] as List?)
                              ?.map((cs) => cs['schools']?['name']?.toString() ?? '')
                              .where((name) => name.isNotEmpty)
                              .toList() ??
                          [];

                      return Card(
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                            child: Text(
                              (u['full_name'] as String?)?.isNotEmpty == true
                                  ? (u['full_name'] as String)[0].toUpperCase()
                                  : 'U',
                              style: const TextStyle(
                                color: AppTheme.primaryColor,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          title: Text(
                            u['full_name'] ?? 'Unnamed',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(u['email'] ?? ''),
                              if (clerkSchools.isNotEmpty)
                                Text(
                                  'Assigned to: ${clerkSchools.join(", ")}',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppTheme.textSecondary,
                                  ),
                                ),
                            ],
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Chip(
                                label: Text(roleStr.toUpperCase()),
                                visualDensity: VisualDensity.compact,
                              ),
                              PopupMenuButton<String>(
                                onSelected: (val) async {
                                  final uid = u['id'] as String;
                                  if (val == 'edit') {
                                    _showEditUserDialog(u);
                                  } else if (val == 'revoke') {
                                    await _adminApi.revokeAllSessions(uid);
                                    if (mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Sessions revoked.')),
                                      );
                                    }
                                  } else if (val == 'delete') {
                                    await _adminApi.deleteUser(uid);
                                    _loadUsers();
                                  }
                                },
                                itemBuilder: (ctx) => [
                                  const PopupMenuItem(
                                    value: 'edit',
                                    child: Text('Edit Role & Schools'),
                                  ),
                                  const PopupMenuItem(
                                    value: 'revoke',
                                    child: Text('Revoke Sessions'),
                                  ),
                                  const PopupMenuItem(
                                    value: 'delete',
                                    child: Text(
                                      'Delete User',
                                      style: TextStyle(color: AppTheme.errorColor),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  // Explore Tab
  Widget _buildExploreTab() {
    final displayedBooks = _exploreBooks.where((b) {
      if (_selectedExploreCategory != null &&
          _selectedExploreCategory!.isNotEmpty &&
          b['category'] != _selectedExploreCategory) {
        return false;
      }
      return true;
    }).toList();

    final totalCopies = displayedBooks.fold<int>(
      0,
      (sum, b) => sum + ((b['quantity'] as num?)?.toInt() ?? 1),
    );

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Explore School Inventory',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    'Search and audit collected records per school',
                    style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                  ),
                ],
              ),
              if (displayedBooks.isNotEmpty)
                Chip(
                  avatar: const Icon(Icons.menu_book, size: 16),
                  label: Text('${displayedBooks.length} titles • $totalCopies copies'),
                ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                flex: 2,
                child: DropdownButtonFormField<String>(
                  initialValue: _selectedExploreSchoolId,
                  hint: const Text('Select a school'),
                  isExpanded: true,
                  items: _schools.map((s) {
                    return DropdownMenuItem(
                      value: s['id'] as String,
                      child: Text(s['name'] as String, overflow: TextOverflow.ellipsis),
                    );
                  }).toList(),
                  onChanged: (val) {
                    setState(() => _selectedExploreSchoolId = val);
                    if (val != null) {
                      _loadExploreBooks(val, _exploreSearchController.text);
                    }
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: DropdownButtonFormField<String?>(
                  initialValue: _selectedExploreCategory,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Category'),
                  items: [
                    const DropdownMenuItem(value: null, child: Text('All Categories')),
                    for (final cat in kBookCategories)
                      DropdownMenuItem(value: cat, child: Text(cat, overflow: TextOverflow.ellipsis)),
                  ],
                  onChanged: (cat) => setState(() => _selectedExploreCategory = cat),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 3,
                child: TextField(
                  controller: _exploreSearchController,
                  decoration: InputDecoration(
                    hintText: 'Search books by title, author, or ISBN...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: IconButton(
                      icon: const Icon(Icons.arrow_forward),
                      onPressed: () {
                        if (_selectedExploreSchoolId != null) {
                          _loadExploreBooks(
                            _selectedExploreSchoolId!,
                            _exploreSearchController.text,
                          );
                        }
                      },
                    ),
                  ),
                  onSubmitted: (val) {
                    if (_selectedExploreSchoolId != null) {
                      _loadExploreBooks(_selectedExploreSchoolId!, val);
                    }
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Expanded(
            child: _isLoadingExplore
                ? const Center(child: CircularProgressIndicator())
                : _selectedExploreSchoolId == null
                    ? const Center(
                        child: Text(
                          'Select a school above to inspect its collected inventory.',
                          style: TextStyle(color: AppTheme.textSecondary),
                        ),
                      )
                    : displayedBooks.isEmpty
                        ? const Center(
                            child: Text(
                              'No matching book records found for this filter.',
                              style: TextStyle(color: AppTheme.textSecondary),
                            ),
                          )
                        : ListView.separated(
                            itemCount: displayedBooks.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 8),
                            itemBuilder: (ctx, idx) {
                              final b = displayedBooks[idx];
                              return Card(
                                child: ListTile(
                                  onTap: () {
                                    showDialog(
                                      context: context,
                                      builder: (ctx) => AlertDialog(
                                        title: Text(b['title'] ?? 'Untitled'),
                                        content: SizedBox(
                                          width: 400,
                                          child: SingleChildScrollView(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                _buildDetailRow('Author', b['author'] ?? '—'),
                                                if (b['author_2'] != null)
                                                  _buildDetailRow('Author 2', b['author_2']),
                                                if (b['author_3'] != null)
                                                  _buildDetailRow('Author 3', b['author_3']),
                                                _buildDetailRow('ISBN', b['isbn'] ?? '—'),
                                                _buildDetailRow('Publisher', b['publisher'] ?? '—'),
                                                _buildDetailRow('Year', b['year'] ?? '—'),
                                                _buildDetailRow('Category', b['category'] ?? '—'),
                                                _buildDetailRow('Condition', b['condition'] ?? '—'),
                                                _buildDetailRow('Copies', '${b["quantity"] ?? 1}'),
                                                _buildDetailRow('Shelf', b['shelf_location'] ?? '—'),
                                                if (b['notes'] != null)
                                                  _buildDetailRow('Notes', b['notes']),
                                              ],
                                            ),
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
                                  },
                                  leading: CircleAvatar(
                                    backgroundColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                                    child: const Icon(Icons.book, color: AppTheme.primaryColor, size: 20),
                                  ),
                                  title: Text(
                                    b['title'] ?? 'Untitled',
                                    style: const TextStyle(fontWeight: FontWeight.bold),
                                  ),
                                  subtitle: Text(
                                    '${b["author"] ?? "Unknown"} • ${b["quantity"]} copies • Category: ${b["category"] ?? "General"}',
                                  ),
                                  trailing: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        b['isbn'] ?? '',
                                        style: const TextStyle(
                                          fontFamily: 'monospace',
                                          fontSize: 12,
                                          color: AppTheme.textSecondary,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Shelf: ${b["shelf_location"] ?? "Unassigned"}',
                                        style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 90,
            child: Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 12,
                color: AppTheme.textSecondary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }

  // Duplicates Tab
  Widget _buildDuplicatesTab() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Duplicate Resolutions',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    'Manage books with identical ISBN numbers',
                    style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                  ),
                ],
              ),
              Row(
                children: [
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                    ),
                    icon: const Icon(Icons.call_merge, size: 18),
                    label: const Text('Review & Merge'),
                    onPressed: () => context
                        .push('/resolve-duplicates')
                        .then((_) => _loadDuplicates()),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.refresh),
                    onPressed: _loadDuplicates,
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          Expanded(
            child: _isLoadingDuplicates
                ? const Center(child: CircularProgressIndicator())
                : _duplicates.isEmpty
                    ? const Center(
                        child: Text('No duplicate ISBN groups detected.'),
                      )
                    : ListView.separated(
                        itemCount: _duplicates.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 8),
                        itemBuilder: (ctx, idx) {
                          final d = _duplicates[idx];
                          return Card(
                            child: ListTile(
                              onTap: () => context
                                  .push('/resolve-duplicates')
                                  .then((_) => _loadDuplicates()),
                              leading: const CircleAvatar(
                                backgroundColor: Color(0xFFFEF3C7),
                                child: Icon(Icons.copy, color: AppTheme.warningColor),
                              ),
                              title: Text(
                                d['title'] ?? 'Unknown Title',
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              subtitle: Text('ISBN: ${d["isbn"]} • Author: ${d["author"] ?? "N/A"}'),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Chip(
                                    label: Text('${d["duplicate_count"]} duplicates'),
                                    backgroundColor: AppTheme.warningColor.withValues(alpha: 0.15),
                                    labelStyle: const TextStyle(
                                      color: AppTheme.warningColor,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  const Icon(Icons.chevron_right, color: AppTheme.textSecondary),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  // Catalogue Tab
  Widget _buildCatalogueTab() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Shared Metadata Catalogue',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    '$_totalCatalogueCount books in the global lookup pool',
                    style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: () {
                  _loadCatalogueCount();
                  if (_catalogueSearchController.text.isNotEmpty) {
                    _searchCatalogue(_catalogueSearchController.text);
                  }
                },
              ),
            ],
          ),
          const SizedBox(height: 16),
          // CSV Import Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.upload_file_outlined, color: AppTheme.primaryColor),
                      const SizedBox(width: 8),
                      const Text(
                        'Import Reference Catalogue from CSV',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      const Spacer(),
                      ElevatedButton.icon(
                        icon: _isImportingCatalogue
                            ? const SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.file_upload_outlined, size: 16),
                        label: Text(_isImportingCatalogue ? 'Importing…' : 'Choose CSV File'),
                        onPressed: _isImportingCatalogue ? null : _importCatalogueCsv,
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Supports columns: book_title, author, isbn, publisher, year_published, category_name. '
                    'Books will be added to the shared lookup database for instant barcode auto-fill.',
                    style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                  ),
                  if (_importProgress != null) ...[
                    const SizedBox(height: 12),
                    LinearProgressIndicator(value: _importProgress),
                    const SizedBox(height: 4),
                    Text(
                      '${(_importProgress! * 100).toStringAsFixed(0)}% completed',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Search & Browse
          TextField(
            controller: _catalogueSearchController,
            decoration: InputDecoration(
              hintText: 'Search catalogue by title or keyword…',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _catalogueSearchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () {
                        _catalogueSearchController.clear();
                        setState(() => _catalogueResults = []);
                      },
                    )
                  : null,
            ),
            onChanged: _searchCatalogue,
          ),
          const SizedBox(height: 12),
          Expanded(
            child: _isSearchingCatalogue
                ? const Center(child: CircularProgressIndicator())
                : _catalogueResults.isEmpty
                    ? Center(
                        child: Text(
                          _catalogueSearchController.text.length < 2
                              ? 'Type at least 2 characters to search reference books.'
                              : 'No matching reference books found.',
                          style: const TextStyle(color: AppTheme.textSecondary),
                        ),
                      )
                    : ListView.separated(
                        itemCount: _catalogueResults.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 8),
                        itemBuilder: (ctx, idx) {
                          final item = _catalogueResults[idx];
                          return Card(
                            child: ListTile(
                              leading: const CircleAvatar(
                                backgroundColor: Color(0xFFF1F5F9),
                                child: Icon(Icons.menu_book, color: AppTheme.primaryColor),
                              ),
                              title: Text(
                                item['title'] ?? 'Untitled',
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              subtitle: Text(
                                '${item["author"] ?? "Unknown Author"}'
                                '${item["publisher"] != null ? " • ${item["publisher"]}" : ""}'
                                '${item["year"] != null ? " (${item["year"]})" : ""}',
                              ),
                              trailing: Chip(
                                label: Text(item['isbn'] ?? 'No ISBN'),
                                visualDensity: VisualDensity.compact,
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
