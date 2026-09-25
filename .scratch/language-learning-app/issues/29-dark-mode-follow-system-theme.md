# 29: Dark mode following the system theme

**What to build:** App always renders light on iPhone even when iOS is in dark mode. Native side already allows it (`userInterfaceStyle: automatic`, `UIUserInterfaceStyle: Automatic`); app code has no dark support. Follow system only — no manual override in Settings.

- `src/theme/tokens.ts` → light + dark palettes (iOS system greys: `#000`/`#1c1c1e` backgrounds, white text; brighter ok/warn/error band colors in dark).
- Tokens are `DynamicColorIOS` values, so module-level `StyleSheet`s switch live without hooks.
- `useNavigationTheme()`: `useColorScheme()` → `DarkTheme`/`DefaultTheme` for the expo-router `ThemeProvider`, so headers follow.
- Themed `Text`/`TextInput` wrappers default to the `text` color (RN text is black by default on iOS).
- Replace every hardcoded hex color in screens/components with palette values.
- `expo-status-bar` with `style="auto"`.

- [ ] app test: `useNavigationTheme()` returns dark palette for `dark`, light for `light`/`unspecified`.
- [ ] no hardcoded hex colors left outside `src/theme`.
- [ ] sim: screenshots of every tab + key detail screens in light and dark (`xcrun simctl ui booted appearance dark|light`); theme switches live without app restart.
