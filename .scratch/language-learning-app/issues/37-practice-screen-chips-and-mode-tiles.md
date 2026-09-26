# 37: Practice screen chips and mode tiles

Label: `ready-for-agent`

Prototype (primary source): variant C ("Chips + mode tiles") on the "What to practice" screen. It is currently uncommitted in the working tree of branch `issues-35`; capture it on branch `prototype/practice-layout` before implementing. Open "What to practice" and use the pink bar at the bottom to cycle variants A–D. Where prose and prototype disagree, this spec wins.

## Problem Statement

On the "What to practice" screen, the picked phrases take most of the screen as tall rows (expression, meaning, SRS line, red ✕), so with 5+ phrases the mode picker and Start button are pushed to the bottom and share space with the scrolling list. "Add an expression" is a plain green text link wedged between the list and the mode chips, easy to miss and visually part of neither. The modes (Chat, Gaps, Describe it, Smuggle) are small undifferentiated chips; what each mode does is only explained after you pick it, one hint line at a time. The Start button scrolls with the content instead of staying reachable.

## Solution

- Phrases render as compact wrapping chips under a "PHRASES" caption: expression text + a small ✕. Tapping a chip opens that expression's detail.
- "Add an expression" becomes the last chip in that wrap: a dashed green outline chip "＋ Add expression", so adding sits exactly where the new phrase will appear.
- Modes render under a "HOW" caption as a 2×2 grid of tiles. Each tile shows the mode emoji, name and a one-line blurb of what it does. The selected tile has a green border and soft green fill.
- In Chat mode, scenario presets, situation field and style chips follow below the tiles (unchanged behaviour).
- The Start button is pinned to the bottom of the screen, above a hairline, and carries the mode emoji and label ("💬 Start chat").

## User Stories

1. As a learner, I want the picked phrases shown as compact chips, so that I see the whole selection at a glance without scrolling.
2. As a learner, I want the phrases section labelled "PHRASES", so that I know what the chips are.
3. As a learner, I want to tap a phrase chip, so that I can open its detail and recall its meaning.
4. As a learner, I want a ✕ on each phrase chip, so that I can drop a phrase I don't want to practice now.
5. As a learner, I want the ✕ big enough to see and hit with a finger (≥44pt target), so that I don't open the detail by accident when I meant to remove.
6. As a learner, I want the ✕ hidden when only one phrase is left, so that I can never start a session with nothing to practice.
7. As a learner, I want an "＋ Add expression" chip right after the last phrase, so that adding is obvious and sits where the new phrase will land.
8. As a learner, I want the add chip styled differently (dashed outline, green) from phrase chips, so that I don't mistake it for a phrase.
9. As a learner, I want the add chip to open the existing expression picker, so that I choose from my vocabulary the same way as before.
10. As a learner, I want a newly added phrase to appear as a chip just before the add chip, so that I see my change immediately.
11. As a learner, I want the add chip to disappear when I reach the maximum number of phrases, so that I'm not offered an action that can't work.
12. As a learner, I want the modes labelled "HOW", so that the screen reads "what phrases, how to practice".
13. As a learner, I want each mode as a tile with an emoji and name, so that I can tell modes apart at a glance.
14. As a learner, I want each tile to explain the mode in one short line, so that I can choose without trying each one.
15. As a learner, I want the selected tile clearly highlighted, so that I know which mode will start.
16. As a learner, I want the mode I arrived with (from the home Practice sheet) preselected, so that I don't pick it twice.
17. As a learner, I want switching mode to keep reloading the right number of picked phrases for that mode, so that behaviour matches today.
18. As a learner in Chat mode, I want scenario presets, the situation field and style chips below the tiles, so that I can set up the conversation as before.
19. As a learner in a drill mode, I want no extra hint line under the tiles, so that the explanation isn't shown twice.
20. As a learner, I want the Start button always visible at the bottom, so that I can start without scrolling past the setup.
21. As a learner, I want the Start button to show the mode emoji and name, so that I confirm what I'm about to start.
22. As a learner, I want Start disabled until the selection is valid (e.g. Chat without a situation or preset), so that I can't start a broken session.
23. As a learner, I want "Starting…" on the button while the session is created, so that I know my tap registered.
24. As a learner, I want an error line above Start if the session can't be created, so that I know to retry.
25. As a learner using dark mode, I want chips, tiles and the pinned footer to follow the system theme, so that the screen matches the rest of the app.
26. As a learner opening practice for a single expression (from home's weakest phrases), I want the same layout with one chip, so that the screen is consistent.

## Implementation Decisions

- Only the "What to practice" screen's rendering changes. Target selection (remove, add, vocabulary pruning, max count), picked-expression loading per mode, scenario/context/style draft state and training creation stay as they are.
- New presentational component: **practice target chips**. Input: targets, whether removal is allowed, callbacks for open, remove(index) and add (absent when at max). Renders the phrase chips and the trailing dashed add chip.
- New presentational component: **mode tiles**. Input: modes, selected mode, onSelect. Each tile: emoji, name, one-line blurb; selected state exposed via accessibility state.
- Mode metadata (emoji + blurb) lives beside the existing mode list and hints. Emojis match the home practice sheet: 💬 Chat, 🧩 Gaps, 🗣️ Describe it, 🎒 Smuggle. Chat blurb: "Role-play a situation with the tutor." Drill blurbs reuse the existing hints but must fit the tile without truncation on iPhone 13 Pro width; shorten "Describe it" (it truncated in the prototype at 3 lines).
- The drill hint line below the mode picker is removed; tiles carry that explanation.
- Chat scene (presets, situation, style) is extracted as-is and rendered below the tiles only in Chat mode.
- Layout: scrollable body (phrases, tiles, chat scene) + a non-scrolling footer with a top hairline holding the error line and Start button (radius 14, taller padding). The footer respects the bottom safe area.
- Chip remove ✕ must be comfortably finger-tappable: a ≥44×44pt touch target (Apple HIG, same rule as issue 36) and a visibly larger glyph than the prototype's 16pt muted ×, e.g. a ~20pt icon in a round muted badge. The touch area may extend beyond the chip via hit slop but must not overlap the neighbouring chip's ✕ or the chip's own open area so much that taps land on the wrong action; increase chip gap if needed.
- The per-row meaning and SRS summary are no longer shown on this screen; they remain on the expression detail reached by tapping the chip.
- Tiles are a 2-column wrap (two per row), not a horizontal scroller.
- Styling uses existing theme tokens only (bubble for chip fill, ok/okSoft for add chip and selected tile, border/muted for idle tile); no new tokens.
- Prototype-only code (variant switcher, variants A/B/D) does not land in main.

## Testing Decisions

- Test external behaviour through the two new components with React Native Testing Library, like the existing target chips and srs summary component tests. No snapshot or style assertions.
- Practice target chips: renders one chip per target with its expression; pressing a chip calls open with that target; pressing a ✕ calls remove with the right index; no ✕ when removal isn't allowed; add chip present and calls add when provided; add chip absent when add isn't provided.
- Mode tiles: renders every mode's name and blurb; pressing a tile calls onSelect with its mode; only the selected tile reports selected in accessibility state.
- Target selection logic keeps its existing hook tests unchanged.
- Verify in the iPhone 13 Pro simulator, light and dark, including tapping each ✕ at its edges to confirm it removes rather than opens detail: 5 phrases, add up to max, remove down to one, each mode, Chat with and without a preset, Start pinned and working.

## Out of Scope

- Changing how phrases are picked, the per-mode target counts, or the expression picker itself.
- Reordering phrases or drag-and-drop.
- Swipe-to-remove.
- Changes to the home Practice sheet.
- Showing meaning or SRS stats on the chips.

## Further Notes

- Variants B (card + segmented control) and D (ghost add row + mode action sheet) were considered and rejected in favour of C.
