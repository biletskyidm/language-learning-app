# 40: Assessment preview scoreboard

Prototype (primary source): variant B ("Scoreboard") on branch `prototype/assessment-preview`, commit `716130b` (`app/src/components/assessment-preview-prototype.tsx`, wired in `app/app/trainings/[id].tsx`). Long-press an assessed message; the pink pill at the top cycles variants A–C. Where prose and prototype disagree, this spec wins.

**Problem:** Long-pressing a message opens one long wall of text, often two to three screens with real LLM feedback. Text is cut hard at the card edges, and the dimmed backdrop does not separate the card from the chat behind it.

**Solution:** An at-a-glance scoreboard on a blurred backdrop. Scores are always visible, and feedback for one category at a time opens on tap. Scrolled text fades out at the card edges.

## Layout

- Backdrop: RN `Modal` (transparent, `fade`), so it also covers the native header. It contains an `expo-blur` `BlurView` (intensity 40, tint `systemUltraThinMaterial`) under a `rgba(0,0,0,0.12)` dim. Tapping it dismisses the preview.
- Card: centred, 16pt side margins, max 80% of window height, radius 20, `colors.surface`, soft shadow.
- Hero: overall score (1 decimal, 34pt heavy, score color) + strengths (12pt muted, 3 lines max).
- Rows: one per category (Context, Grammar, Vocabulary, Complexity, Naturalness), then a "Targets" heading with one row per attempted target. Each row shows the label (120pt wide, up to 2 lines so target phrases fit), a `ScoreBar`, the integer score in score color, and `+`/`−`. Rows are separated by hairlines.
- Open row: feedback (13pt), then "Try:" (green, bold) + suggestions (13pt muted), then `✓ correctVersion` for targets.
- Last row: "To improve +" (green), which opens `areasForImprovement`.
- Rows scroll inside the card below the hero. A 40pt gradient in the surface color fades text at the top edge (once scrolled) and at the bottom edge (while more is below). The gradient opacity follows the scroll position.

## Behavior

| Action | Result |
| --- | --- |
| Long-press an assessed message | Preview fades in over a blurred screen, all rows collapsed |
| Tap a row | It opens and any other open row closes (animated) |
| Tap an open row | It closes |
| Tap the hero | Strengths expand to full text; this counts as the one open item |
| Tap outside the card / Android back | Preview dismisses |

## Decisions

- Rewrite `src/components/assessment-preview.tsx` in place, keeping the `{ assessment, onDismiss }` props. Both callers (chat and history) get the new UI unchanged.
- Add `expo-blur` (native dependency). It needs `pod install` and a dev-client rebuild. The phone Release build must be rebuilt before it shows the new UI.
- Fade gradients use `experimental_backgroundImage: linear-gradient(...)` and need hex colors. Export the raw `palettes` from `theme/tokens.ts` and pick one with `useColorScheme()`. No new color tokens.
- Tapping the hero to expand strengths is an addition over the prototype, so the 3-line cap never hides text for good.
- Accessibility: the backdrop is labelled "Dismiss assessment"; each row is a button labelled with its name and score, with `accessibilityState.expanded`.
- Prototype-only code (switcher, variants A/C, prototype file) does not land in main.

**Out of scope:** assessment prompt or data shape, message badge, target chips, session summary, variants A (dense card) and C (swipe pages).

- [ ] app tests: hero shows overall score + strengths; every category and attempted target renders its label and score; feedback/suggestions/correctVersion hidden until the row is pressed; pressing another row closes the first; "To improve" reveals `areasForImprovement`; backdrop press calls `onDismiss`.
- [ ] Sim (iPhone 13 Pro, light + dark): chat and history previews open with blur over the header, rows expand/collapse, edge fades appear only when there is more text, and long feedback plus a target row fit without the card leaving the screen.
