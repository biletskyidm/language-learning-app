# 31: Native capsule header buttons

**What to build:** Right-side header buttons (End, +, Edit, Save) are custom `Pressable`+`Text` in `headerRight`; iOS 26 wraps them in a circular glass bubble. Back button ("< Home") is a native bar item → capsule. Make right buttons match.

- Replace `headerRight` with expo-router `Stack.Toolbar placement="right"` + `Stack.Toolbar.Button` (text label, `onPress`, `disabled`, `tintColor`).
- End (`colors.error`): chat, gaps, smuggle, describe training screens; only while active.
- `+` (`icon="plus"`, `colors.ok`): vocabulary list.
- Edit: expression detail, only when loaded; disabled while deleting.
- Save (`colors.ok`): `ExpressionForm`, disabled until valid.
- Drop now-unused header text styles.

- [ ] app: `tsc --noEmit` + jest pass.
- [ ] sim: vocab `+`, expression Edit, form Save, each training End render as capsules like the back button; disabled states greyed; taps work.
