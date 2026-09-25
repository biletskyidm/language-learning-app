# 30: "Fill with AI" responds to the first tap while the keyboard is open

**What to build:** On the create form, typing an expression then tapping "Fill with AI" only dismisses the keyboard; a second tap is needed. Cause: `ExpressionForm` ScrollView uses default `keyboardShouldPersistTaps="never"`.

- `src/components/expression-form.tsx`: ScrollView `keyboardShouldPersistTaps="handled"` (same as smuggle/describe drill screens). Also fixes chips/buttons in the form on create + edit.
- `fill` calls `Keyboard.dismiss()` first so drafted fields are visible.

- [x] app test: `expression-form.test.tsx` passes.
- [x] sim: new expression → type text (keyboard open) → one tap on Fill with AI → "Drafting…", keyboard closes, fields fill.
