import 'dart:typed_data';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/theme.dart';
import '../../data/remote/supabase_client.dart';

/// Profile name, avatar photo and password change, for every signed-in role.
class AccountSettingsScreen extends ConsumerStatefulWidget {
  const AccountSettingsScreen({super.key});

  @override
  ConsumerState<AccountSettingsScreen> createState() =>
      _AccountSettingsScreenState();
}

class _AccountSettingsScreenState extends ConsumerState<AccountSettingsScreen> {
  final _nameController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  String? _avatarUrl;
  bool _loading = true;
  bool _savingProfile = false;
  bool _uploadingAvatar = false;
  bool _savingPassword = false;
  bool _showNew = false;
  bool _showConfirm = false;

  static const _maxAvatarBytes = 5 * 1024 * 1024;
  static const _mimeByExt = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
  };

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _snack(String message, {Color? color}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: color),
    );
  }

  Future<void> _loadProfile() async {
    final user = supabase.auth.currentUser;
    if (user == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    try {
      final row = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle();
      if (!mounted) return;
      setState(() {
        _nameController.text = (row?['full_name'] ?? '').toString();
        _avatarUrl = row?['avatar_url']?.toString();
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      _snack('Could not load your profile: $e', color: AppTheme.errorColor);
    }
  }

  Future<void> _saveProfile() async {
    final user = supabase.auth.currentUser;
    if (user == null) return;
    setState(() => _savingProfile = true);
    try {
      final name = _nameController.text.trim();
      await supabase
          .from('profiles')
          .update({'full_name': name.isEmpty ? null : name})
          .eq('id', user.id);
      _snack('Profile updated!', color: AppTheme.successColor);
    } catch (e) {
      _snack('Failed to save: $e', color: AppTheme.errorColor);
    } finally {
      if (mounted) setState(() => _savingProfile = false);
    }
  }

  Future<void> _pickAvatar() async {
    final user = supabase.auth.currentUser;
    if (user == null) return;

    final file = await FilePicker.pickFile(
      type: FileType.image,
    );
    if (file == null) return;

    final Uint8List bytes;
    try {
      bytes = await file.readAsBytes();
    } catch (_) {
      _snack('Could not read the selected image.', color: AppTheme.errorColor);
      return;
    }
    if (bytes.length > _maxAvatarBytes) {
      _snack('Image must be under 5 MB.', color: AppTheme.errorColor);
      return;
    }
    final ext = (file.extension ?? '').toLowerCase();
    final mime = _mimeByExt[ext];
    if (mime == null) {
      _snack('Please select a JPG, PNG, WEBP or GIF image.',
          color: AppTheme.errorColor);
      return;
    }

    setState(() => _uploadingAvatar = true);
    try {
      final path = '${user.id}/avatar.$ext';
      await supabase.storage.from('avatars').uploadBinary(
            path,
            bytes,
            fileOptions: FileOptions(upsert: true, contentType: mime),
          );
      final base = supabase.storage.from('avatars').getPublicUrl(path);
      final publicUrl = '$base?t=${DateTime.now().millisecondsSinceEpoch}';
      await supabase
          .from('profiles')
          .update({'avatar_url': publicUrl}).eq('id', user.id);
      if (!mounted) return;
      setState(() => _avatarUrl = publicUrl);
      _snack('Profile photo updated!', color: AppTheme.successColor);
    } catch (e) {
      _snack('Upload failed: $e', color: AppTheme.errorColor);
    } finally {
      if (mounted) setState(() => _uploadingAvatar = false);
    }
  }

  Future<void> _removeAvatar() async {
    final user = supabase.auth.currentUser;
    if (user == null) return;
    setState(() => _uploadingAvatar = true);
    try {
      await supabase
          .from('profiles')
          .update({'avatar_url': null}).eq('id', user.id);
      if (!mounted) return;
      setState(() => _avatarUrl = null);
      _snack('Profile photo removed.');
    } catch (e) {
      _snack('Failed to remove photo: $e', color: AppTheme.errorColor);
    } finally {
      if (mounted) setState(() => _uploadingAvatar = false);
    }
  }

  Future<void> _changePassword() async {
    final pw = _newPasswordController.text;
    final confirm = _confirmPasswordController.text;
    if (pw.isEmpty) {
      _snack('Please enter a new password.', color: AppTheme.errorColor);
      return;
    }
    if (pw.length < 8) {
      _snack('Password must be at least 8 characters.',
          color: AppTheme.errorColor);
      return;
    }
    if (pw != confirm) {
      _snack('Passwords do not match.', color: AppTheme.errorColor);
      return;
    }

    setState(() => _savingPassword = true);
    try {
      await supabase.auth.updateUser(UserAttributes(password: pw));
      _newPasswordController.clear();
      _confirmPasswordController.clear();
      _snack('Password updated successfully!', color: AppTheme.successColor);
    } on AuthException catch (e) {
      _snack(e.message, color: AppTheme.errorColor);
    } catch (e) {
      _snack('Failed to update password: $e', color: AppTheme.errorColor);
    } finally {
      if (mounted) setState(() => _savingPassword = false);
    }
  }

  String _initials() {
    final name = _nameController.text.trim();
    final source =
        name.isNotEmpty ? name : (supabase.auth.currentUser?.email ?? 'U');
    final parts =
        source.split(RegExp(r'[\s@.]+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return 'U';
    final first = parts.first[0];
    final second = parts.length > 1 ? parts[1][0] : '';
    return (first + second).toUpperCase();
  }

  String _roleLabel(String? role) {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'clerk':
        return 'Clerk';
      default:
        return 'User';
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider).value;
    final email = supabase.auth.currentUser?.email ?? '';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Account Settings'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/');
            }
          },
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 560),
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text('Profile',
                                style: TextStyle(
                                    fontSize: 16, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 16),
                            Center(
                              child: Stack(
                                alignment: Alignment.center,
                                children: [
                                  CircleAvatar(
                                    radius: 44,
                                    backgroundColor:
                                        AppTheme.primaryColor.withValues(alpha: 0.10),
                                    backgroundImage: _avatarUrl != null
                                        ? NetworkImage(_avatarUrl!)
                                        : null,
                                    child: _avatarUrl == null
                                        ? Text(
                                            _initials(),
                                            style: const TextStyle(
                                              fontSize: 26,
                                              fontWeight: FontWeight.bold,
                                              color: AppTheme.primaryColor,
                                            ),
                                          )
                                        : null,
                                  ),
                                  if (_uploadingAvatar)
                                    const CircularProgressIndicator(),
                                ],
                              ),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                OutlinedButton.icon(
                                  icon: const Icon(Icons.photo_camera_outlined,
                                      size: 18),
                                  label: Text(_avatarUrl == null
                                      ? 'Upload photo'
                                      : 'Change photo'),
                                  onPressed:
                                      _uploadingAvatar ? null : _pickAvatar,
                                ),
                                if (_avatarUrl != null) ...[
                                  const SizedBox(width: 8),
                                  TextButton(
                                    onPressed:
                                        _uploadingAvatar ? null : _removeAvatar,
                                    child: const Text('Remove'),
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(height: 20),
                            TextField(
                              controller: _nameController,
                              textCapitalization: TextCapitalization.words,
                              decoration: const InputDecoration(
                                labelText: 'Full name',
                                prefixIcon: Icon(Icons.person_outline),
                              ),
                            ),
                            const SizedBox(height: 12),
                            InputDecorator(
                              decoration: const InputDecoration(
                                labelText: 'Email',
                                prefixIcon: Icon(Icons.email_outlined),
                              ),
                              child: Text(email),
                            ),
                            const SizedBox(height: 12),
                            Align(
                              alignment: Alignment.centerLeft,
                              child: Chip(label: Text(_roleLabel(auth?.role))),
                            ),
                            const SizedBox(height: 12),
                            ElevatedButton(
                              onPressed: _savingProfile ? null : _saveProfile,
                              child: _savingProfile
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2, color: Colors.white),
                                    )
                                  : const Text('Save profile'),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text('Change password',
                                style: TextStyle(
                                    fontSize: 16, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 16),
                            TextField(
                              controller: _newPasswordController,
                              obscureText: !_showNew,
                              decoration: InputDecoration(
                                labelText: 'New password',
                                helperText: 'At least 8 characters',
                                prefixIcon: const Icon(Icons.lock_outline),
                                suffixIcon: IconButton(
                                  icon: Icon(_showNew
                                      ? Icons.visibility_off_outlined
                                      : Icons.visibility_outlined),
                                  onPressed: () =>
                                      setState(() => _showNew = !_showNew),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: _confirmPasswordController,
                              obscureText: !_showConfirm,
                              decoration: InputDecoration(
                                labelText: 'Confirm new password',
                                prefixIcon: const Icon(Icons.lock_outline),
                                suffixIcon: IconButton(
                                  icon: Icon(_showConfirm
                                      ? Icons.visibility_off_outlined
                                      : Icons.visibility_outlined),
                                  onPressed: () => setState(
                                      () => _showConfirm = !_showConfirm),
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: _savingPassword ? null : _changePassword,
                              child: _savingPassword
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2, color: Colors.white),
                                    )
                                  : const Text('Update password'),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    OutlinedButton.icon(
                      icon: const Icon(Icons.logout, size: 18),
                      label: const Text('Sign out'),
                      onPressed: () async {
                        await supabase.auth.signOut();
                        if (context.mounted) context.go('/auth');
                      },
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
