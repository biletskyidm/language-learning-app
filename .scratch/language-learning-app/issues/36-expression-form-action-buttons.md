# 36: Expression form action buttons

Label: `ready-for-agent`

Prototype (primary source): branch `prototype/expression-form-buttons`, commit `e8a3621`, variant C ("Inline accessories") in the expression form. Run it by checking out the branch and opening New expression; the pink bar at the bottom cycles variants A–D. Where prose and prototype disagree, this spec wins.

## Problem Statement

On the New / Edit expression form, "Fill with AI" and "Add example" render as plain iOS text buttons: centered blue text with no shape. They read as links rather than actions, sit disconnected from the fields they act on, and take a full row each. The ✕ that removes an example is a bare 16pt glyph with an 8pt hit slop (~30pt target), so it is easy to miss with a finger.

## Solution

- "Fill with AI" becomes a compact tinted capsule (✨ + label) sitting inside the right end of the Expression field, so the action lives on the field it reads from.
- "Add example" becomes a round **+** button on the right of the "Examples" section label, so it no longer takes its own row below the list.
- Each example's remove ✕ gets a 44×44pt touch area (Apple HIG minimum), with a slightly larger glyph.

## User Stories

1. As a learner adding a phrase, I want "Fill with AI" to look like a button, so that I recognise it as an action and not a link.
2. As a learner, I want "Fill with AI" placed inside the Expression field, so that it is obvious it drafts from what I just typed.
3. As a learner, I want the Fill with AI capsule dimmed until I have typed an expression, so that I know why it does nothing on an empty field.
4. As a learner, I want the capsule to read "Drafting…" while the draft is in flight, so that I know my tap registered.
5. As a learner, I want the capsule to stay dimmed and inert while drafting or while the expression is being saved, so that I cannot fire duplicate drafts.
6. As a learner, I want a long expression's text to stop before the capsule, so that my typed text is never hidden under it.
7. As a learner with the keyboard open, I want a single tap on the capsule to start drafting, so that issue 30's one-tap behaviour is preserved.
8. As a learner, I want a draft error to still appear below the Expression field, so that I see why drafting failed.
9. As a learner, I want an "Add example" + button next to the Examples heading, so that I can add another example without scrolling to the bottom of the list.
10. As a learner, I want each tap on + to append one empty example field, so that I can type several examples.
11. As a learner, I want the ✕ next to an example to have a finger-sized tap area, so that I can remove an example on the first try.
12. As a learner, I want tapping near (not exactly on) the ✕ to still remove the example, so that I do not have to aim at a tiny glyph.
13. As a learner, I want the ✕ tap area not to overlap the example's text input, so that tapping into the field does not delete it.
14. As a learner editing an existing expression, I want the same + and ✕ controls, so that editing behaves like creating.
15. As a learner editing an existing expression, I want no Fill with AI capsule (edit has no fill), and the expression text to use the full field width, so that nothing reserves empty space.
16. As a learner in dark mode, I want the capsule and + button to use the app's tinted green surfaces, so that they fit both themes.
17. As a VoiceOver user, I want the + and ✕ controls announced as "Add example" and "Remove example" buttons, so that icon-only controls are usable.
18. As a VoiceOver user, I want the capsule announced as a disabled button when it cannot be used, so that I know its state.

## Implementation Decisions

- Only the shared expression form component changes; the New and Edit routes are untouched. Fill with AI remains conditional on the form receiving a fill callback (New passes it, Edit does not).
- Fill with AI: a pressable absolutely positioned at the right inside a wrapper around the Expression input, vertically centered. Style: `okSoft` background, fully rounded, ~10pt horizontal / 5pt vertical padding, `ok` 13pt semibold text. Sparkle and label are separate text nodes in a row (keeps "Fill with AI" / "Drafting…" findable as exact text). When the capsule is shown, the input gets right padding (~130pt) so text does not run under it.
- Fill disabled state: disabled when the trimmed expression is empty, while drafting, or while the save is pending — same rule as today. Rendered at 0.4 opacity with `accessibilityState.disabled`.
- Fill error text moves out of the fill conditional and renders directly after the Expression field.
- Add example: the "Examples" label and a 32pt circular pressable share a space-between row. Style: `okSoft` background, `ok` "+" at ~22pt. `accessibilityLabel` "Add example". The old full-width text button below the list is removed.
- Remove example: pressable gets an explicit 44×44pt box with the ✕ centered (glyph 18pt, `muted`), replacing the hit-slop approach. `accessibilityLabel` "Remove example". The example row drops its horizontal gap, since the 44pt box already provides spacing.
- The platform `Button` import is no longer used by the form and is removed.
- Prototype-only pieces (variant switcher, variants A/B/D) do not ship.

## Testing Decisions

- One seam: the existing expression form component test (RN Testing Library, rendered in a SafeAreaProvider with the expo-router Stack mock). Test through what the user sees and taps: text, placeholders, accessibility labels. Do not assert on styles or layout.
- Existing fill tests must keep passing unchanged: they find the capsule by exact text "Fill with AI" and check draft, lock and save behaviour.
- New cases:
  - Pressing the "Add example" labelled button adds one example input (count inputs by the example placeholder).
  - Pressing a "Remove example" labelled button removes that row.
- Tap-target size and visual placement are verified in the iOS Simulator (iPhone 13 Pro), not in jest: + adds rows; a tap ~14pt off the ✕ centre removes the row; capsule dim → active after typing; light and dark.
- Prior art: the fill tests in the same component test file; issue 30's sim check for one-tap fill with the keyboard open.

## Out of Scope

- Tag chips' ✕ (the chip itself is already the tap target) and the Save header button.
- Any change to the fill/draft API, validation, or form state.
- Swipe-to-delete for examples or reordering examples.
- Using the capsule/+ styles elsewhere in the app, or extracting them into shared components.

## Further Notes

- Variant C was chosen over B (full-width filled button + dashed "Add example" tile) and D (AI banner card + ghost "Add another example…" row) as the most compact option.
- Keep the form ScrollView's `keyboardShouldPersistTaps="handled"` from issue 30; the capsule relies on it for one-tap drafting with the keyboard open.
- DoD:
  - [ ] app tests: fill tests pass; add/remove example by accessibility label.
  - [ ] sim: capsule inside field, dimmed until text typed, "Drafting…" on tap; + adds; off-centre ✕ tap removes; light + dark; Edit shows no capsule.
