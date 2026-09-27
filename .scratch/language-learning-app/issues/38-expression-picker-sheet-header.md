# 38: Expression picker sheet header

Label: `ready-for-agent`

Prototype (primary source): variant A ("Grabber + ✕ by search") of the expression picker opened from "＋ Add expression" on the "What to practice" screen. It is currently uncommitted in the working tree of branch `prototype/expression-picker` (`app/src/components/expression-picker.prototype.tsx`, wired in `app/app/practice.tsx`); commit it there before implementing. Open the picker and use the purple bar at the bottom to cycle variants A–C. Where prose and prototype disagree, this spec wins.

Doc version of this spec, with a wireframe: https://claude.ai/code/artifact/3e6aac5a-1dfb-4b78-8f52-39282b5f916f

## Problem Statement

The picker sheet opens with a bold "Add an expression" title, a green "Cancel" text link and a "Tag…" chip. The title repeats what the user just tapped, the Cancel link reads like a form action rather than a way to dismiss a sheet, and the tag filter adds density without helping pick a phrase.

## Solution

- A grabber at the top of the sheet signals it can be swiped down.
- One row under it: a filled search field with a magnifier icon, and a round ✕ close button to its right.
- No title, no Cancel link, no tag filter.
- The list starts right under the search row: phrase (slightly larger), meaning capped at 2 lines, SRS summary, hairline separators.

## Layout

Sheet: `pageSheet` modal on `colors.surface`, 16pt side padding, 8pt top padding, 12pt gap between grabber, search row and list.

| # | Element | Spec |
| --- | --- | --- |
| 1 | Grabber | 36 × 5pt, radius 3, `colors.border`, centred |
| 2 | Search field | Takes the row width left of the close button; `colors.bubble` fill, radius 12, 10pt side padding; magnifier glyph 14pt at 60% opacity; input text 16pt, 10pt vertical padding; placeholder "Search your phrases" in `colors.muted`; iOS clear button while editing |
| 3 | Close button | 30pt circle, `colors.bubble` fill, ✕ at 14pt bold in `colors.muted`; 8pt hit slop (46pt target); 8pt gap from the search field |
| 4 | Row | 10pt vertical padding, 2pt between lines; phrase 16pt semibold; meaning `colors.muted`, max 2 lines with ellipsis; SRS summary 12pt muted; `colors.bubble` background while pressed |
| 5 | Separator | Hairline, `colors.border` |

## States

| State | Under the search row |
| --- | --- |
| Loading (first fetch) | Centered `ActivityIndicator`, 24pt top padding |
| Results | Rows as above |
| No matches | "Nothing matches that", muted, centered |
| Fetch error | "Could not load your vocabulary", muted, centered |
| All phrases already picked | Same as No matches |

## Behavior

| Action | Result |
| --- | --- |
| Tap "＋ Add expression" | Sheet slides up; keyboard stays down, search empty |
| Type in search | List refetches with default filters + `search` (phrase or meaning) |
| Tap a row | Phrase added to practice targets, sheet closes |
| Tap ✕ / swipe down / Android back | Sheet closes, targets unchanged |
| Drag the list | Keyboard dismisses |

## User Stories

1. As a learner, I want the sheet to open without a title, so that I get straight to finding a phrase.
2. As a learner, I want a round ✕ next to the search field, so that closing looks like closing a sheet, not cancelling a form.
3. As a learner, I want a grabber at the top, so that I know I can swipe the sheet away.
4. As a learner, I want the search field filled and marked with a magnifier, so that I recognise it as search at a glance.
5. As a learner, I want no tag filter here, so that the sheet stays light.
6. As a learner, I want long meanings cut at 2 lines, so that more phrases fit on screen.
7. As a learner, I want a row to highlight while pressed, so that I know my tap registered.
8. As a learner using VoiceOver, I want the close button announced as "Close, button", so that I can leave the sheet without the title.
9. As a learner using dark mode, I want the sheet to follow the system theme, so that it matches the rest of the app.

## Implementation Decisions

- Rewrite `src/components/expression-picker.tsx` in place; the prototype file is not merged as-is.
- Drop the `title` prop from `ExpressionPicker` and its one caller in `app/practice.tsx`.
- Remove `tag`/`pickingTag` state and the `Chip` and `TagPicker` imports; query with `useExpressions({ ...DEFAULT_FILTERS, search })`.
- Keep `TagPicker`: the Expressions list filter bar still uses it.
- Magnifier and ✕ are text glyphs, as in the prototype: the app has no icon library and adding one for two glyphs is out of scope.
- Accessibility: close button `accessibilityRole="button"`, `accessibilityLabel="Close"`; search field `accessibilityLabel="Search your phrases"`, magnifier and grabber hidden from VoiceOver; rows `accessibilityRole="button"`, label = phrase + meaning, hint "Adds it to this session".
- Styling uses existing theme tokens only; no new tokens.
- Prototype-only code (variant switcher, variants B/C, `expression-picker.prototype.tsx`) does not land in main; restore the real import in `app/practice.tsx`.

## Testing Decisions

- Test external behaviour of `ExpressionPicker` with React Native Testing Library, `useExpressions` mocked. No snapshot or style assertions.
- No "Add an expression", "Cancel" or "Tag…" text rendered.
- Pressing the "Close" button calls `onClose` only.
- Pressing a row calls `onSelect` with that expression, then `onClose`.
- Excluded ids never render.
- Typing passes `search` to `useExpressions`.
- Loading, empty and error texts render for their states.
- Verify in the iPhone 13 Pro simulator, light and dark: open, search, clear, pick, ✕, swipe down, VoiceOver on the close button and a row.

## Out of Scope

- Tag filter on the Expressions list screen.
- Tags on the expression form or in the data model.
- Search API, filters or sort.
- Card rows or ＋ buttons (variant B), bottom search bar (variant C).
- Adding an icon library.

## Further Notes

- Variants B ("Pick a phrase" heading + card rows with ＋) and C (search bar pinned at the bottom with a ⌄ close) were considered and rejected in favour of A.
- The pressed row state is an addition over the prototype; open question in the doc whether to keep it.
