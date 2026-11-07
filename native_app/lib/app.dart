import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/config.dart';
import 'core/router.dart';
import 'core/theme.dart';
import 'data/sync/connectivity_watcher.dart';

class BookInventoryApp extends ConsumerWidget {
  const BookInventoryApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Eagerly initialize connectivity watcher so outbox flush runs when network restores
    ref.watch(connectivityWatcherProvider);
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: AppConfig.appTitle,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      routerConfig: router,
    );
  }
}
