import 'package:flutter/material.dart';

/// Visual identity shared with the web app (inked navy + muted brass on a
/// warm off-white). Constant names are kept so existing screens still compile.
class AppTheme {
  static const primaryColor = Color(0xFF14304F); // inked navy
  static const primaryLight = Color(0xFF2F5D8A); // links / focus
  static const secondaryColor = Color(0xFF93702B); // muted brass accent
  static const backgroundColor = Color(0xFFFAFAF9); // warm off-white
  static const surfaceColor = Colors.white;
  static const textPrimary = Color(0xFF14181F);
  static const textSecondary = Color(0xFF5B6472);
  static const errorColor = Color(0xFFA3342A);
  static const successColor = Color(0xFF2F6B4F);
  static const warningColor = Color(0xFF93702B);
  static const borderColor = Color(0xFFE3E6EB);
  static const mutedFill = Color(0xFFF1F3F6);

  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(
      seedColor: primaryColor,
      brightness: Brightness.light,
    ).copyWith(
      primary: primaryColor,
      onPrimary: backgroundColor,
      secondary: secondaryColor,
      onSecondary: backgroundColor,
      surface: surfaceColor,
      onSurface: textPrimary,
      error: errorColor,
      outline: borderColor,
    );

    final radius = BorderRadius.circular(10);
    OutlineInputBorder border(Color c, [double w = 1]) => OutlineInputBorder(
          borderRadius: radius,
          borderSide: BorderSide(color: c, width: w),
        );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: backgroundColor,
      dividerColor: borderColor,
      dividerTheme: const DividerThemeData(color: borderColor, space: 1),
      textTheme: Typography.blackMountainView.apply(
        bodyColor: textPrimary,
        displayColor: textPrimary,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: primaryColor,
        foregroundColor: backgroundColor,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: backgroundColor,
          fontSize: 18,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.2,
        ),
        iconTheme: IconThemeData(color: backgroundColor),
        actionsIconTheme: IconThemeData(color: backgroundColor),
      ),
      cardTheme: CardThemeData(
        color: surfaceColor,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: borderColor),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: border(borderColor),
        enabledBorder: border(borderColor),
        focusedBorder: border(primaryColor, 2),
        errorBorder: border(errorColor),
        focusedErrorBorder: border(errorColor, 2),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: backgroundColor,
          disabledBackgroundColor: primaryColor.withValues(alpha: 0.4),
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: radius),
          textStyle: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: backgroundColor,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: radius),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: primaryColor,
          side: const BorderSide(color: borderColor),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: radius),
          textStyle: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: primaryLight),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: mutedFill,
        side: BorderSide.none,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        labelStyle: const TextStyle(color: textPrimary, fontSize: 12),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: surfaceColor,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: primaryColor,
        contentTextStyle: const TextStyle(color: backgroundColor),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: surfaceColor,
        indicatorColor: primaryColor.withValues(alpha: 0.10),
        selectedIconTheme: const IconThemeData(color: primaryColor),
        unselectedIconTheme: const IconThemeData(color: textSecondary),
        selectedLabelTextStyle: const TextStyle(
          color: primaryColor,
          fontWeight: FontWeight.w600,
          fontSize: 12,
        ),
        unselectedLabelTextStyle:
            const TextStyle(color: textSecondary, fontSize: 12),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: surfaceColor,
        selectedItemColor: primaryColor,
        unselectedItemColor: textSecondary,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
      ),
      listTileTheme: const ListTileThemeData(
        iconColor: textSecondary,
        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      ),
      progressIndicatorTheme:
          const ProgressIndicatorThemeData(color: primaryColor),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: primaryColor,
        foregroundColor: backgroundColor,
      ),
      tabBarTheme: const TabBarThemeData(
        labelColor: primaryColor,
        unselectedLabelColor: textSecondary,
        indicatorColor: secondaryColor,
      ),
    );
  }
}
