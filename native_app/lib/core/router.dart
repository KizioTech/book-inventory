import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../data/remote/supabase_client.dart';
import '../features/auth/sign_in_screen.dart';
import '../features/auth/reset_password_screen.dart';
import '../features/scan/scan_screen.dart';
import '../features/clerk/clerk_dashboard_screen.dart';
import '../features/admin/admin_dashboard_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const Scaffold(
          body: Center(child: CircularProgressIndicator()),
        ),
      ),
      GoRoute(
        path: '/auth',
        builder: (context, state) => const SignInScreen(),
      ),
      GoRoute(
        path: '/reset-password',
        builder: (context, state) => const ResetPasswordScreen(),
      ),
      GoRoute(
        path: '/scan',
        builder: (context, state) => const ScanScreen(),
      ),
      GoRoute(
        path: '/clerk',
        builder: (context, state) => const ClerkDashboardScreen(),
      ),
      GoRoute(
        path: '/admin',
        builder: (context, state) => const AdminDashboardScreen(),
      ),
    ],
    redirect: (context, state) {
      final isAuthLoading = authState.isLoading;
      if (isAuthLoading) return null;

      final auth = authState.value;
      final isAuthenticated = auth?.isAuthenticated ?? false;
      final isAuthRoute = state.matchedLocation == '/auth' ||
          state.matchedLocation == '/reset-password';

      // 1. Not authenticated -> Redirect to /auth
      if (!isAuthenticated) {
        return isAuthRoute ? null : '/auth';
      }

      // 2. Authenticated -> Role based redirection from '/' or '/auth'
      if (state.matchedLocation == '/' || state.matchedLocation == '/auth') {
        if (auth?.isAdmin ?? false) {
          return '/admin';
        } else {
          return '/scan';
        }
      }

      // 3. Role guarding: Clerks cannot access /admin
      if (state.matchedLocation.startsWith('/admin') && !(auth?.isAdmin ?? false)) {
        return '/scan';
      }

      return null;
    },
  );
});
