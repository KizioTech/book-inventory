import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'sync_service.dart';

class ConnectivityWatcher {
  final SyncService _syncService;
  StreamSubscription<List<ConnectivityResult>>? _subscription;

  ConnectivityWatcher(this._syncService) {
    _init();
  }

  void _init() {
    _subscription = Connectivity().onConnectivityChanged.listen((results) {
      final isOnline = results.any((r) => r != ConnectivityResult.none);
      if (isOnline) {
        _syncService.flush();
      }
    });
  }

  void dispose() {
    _subscription?.cancel();
  }
}

final connectivityWatcherProvider = Provider<ConnectivityWatcher>((ref) {
  final syncService = ref.watch(syncServiceProvider);
  final watcher = ConnectivityWatcher(syncService);
  ref.onDispose(() => watcher.dispose());
  return watcher;
});
