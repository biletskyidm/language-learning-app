# 33: Home dashboard redesign

Label: `ready-for-agent`

Prototype (primary source): branch `prototype/home-screen`, commit `c567f2d`, component `VariantB` in the home variants prototype module. Run it by checking out the branch; Home opens on variant B. The prototype computes every stat on the phone from existing endpoints; this spec moves that work to the API. Where prose and prototype disagree, this spec wins.

## Problem Statement

Home is a centered stack of plain iOS text buttons (four practice modes, then Vocabulary / Sessions / Settings) with "N due today", a weakest-phrases list and a week chart. The buttons have no grouping or hierarchy, the most frequent action (start practice) looks the same as rare ones (Settings), active sessions from PRD story 46 are missing, and the screen says nothing about vocabulary size, long-term score progress, or chat skill levels.

## Solution

Home becomes a card-based dashboard under a native header:

- Navigation moves into the native header as capsule icon buttons: Settings on the left, Vocabulary and Sessions on the right. No header title.
- Starting practice becomes one floating green "Practice" button at the bottom that opens a mode sheet (Chat, Describe it, Smuggle).
- The scroll body shows, top to bottom: two count tiles (Due today, Never practiced, each "N / total"), the weekly training chart (shorter than today), active sessions (count + 2 newest), weakest phrases, a 30-day average-score line chart, and chat skill averages across all completed chats.
- New numbers (total phrases, active count, score trend, chat skills) come from the existing progress summary endpoint, so Home still loads in one request.

## User Stories

1. As the user, I want Home's navigation (Settings, Vocabulary, Sessions) in the header as icon buttons, so that content gets the whole screen and navigation is always in the same place.
2. As the user, I want the Settings button alone on the left and Vocabulary + Sessions grouped on the right, so that rarely used settings are apart from the things I open daily.
3. As the user, I want the header to have no title, so that the dashboard starts right away without wasted space.
4. As the user, I want one prominent "Practice" button floating at the bottom, so that starting a session is the obvious primary action.
5. As the user, I want tapping Practice to show a sheet with Chat, Describe it and Smuggle, each with the number of phrases it will use, so that I know what I'm starting.
6. As the user, I want Gaps not offered in the Home practice sheet, so that the sheet shows only the modes I use from Home.
7. As the user, I want to still reach Gaps from the practice screen's mode chips, so that hiding it on Home doesn't remove the drill.
8. As the user, I want picking a mode in the sheet to open the practice screen with that mode preselected, so that I go straight to target selection.
9. As the user, I want cancelling the sheet to leave me on Home, so that an accidental tap costs nothing.
10. As the user, I want a "Due today" tile showing "N / total", so that I see how much of my vocabulary needs review.
11. As the user, I want tapping "Due today" to open the vocabulary list filtered to due items, so that I can see which phrases are due.
12. As the user, I want a "Never practiced" tile showing "N / total", so that I see how much of my vocabulary is untouched.
13. As the user, I want the total in both tiles to be my whole vocabulary size, so that both fractions share one denominator.
14. As the user, I want the weekly "Expressions trained this week" chart second, right under the tiles, so that my recent activity is visible without scrolling.
15. As the user, I want that chart about 25% shorter than today, so that it doesn't push the rest of the dashboard down.
16. As the user, I want an "Active sessions (N)" card where N is the exact number of active sessions, so that I know how many are open.
17. As the user, I want that card to list only the 2 newest active sessions, so that it stays compact.
18. As the user, I want tapping a listed session to resume it, so that I can continue where I left off.
19. As the user, I want tapping the card header to open Sessions with the Active filter already on, so that I can see all active sessions.
20. As the user, I want the active sessions card hidden when nothing is active, so that Home has no empty cards.
21. As the user, I want a "Weakest phrases" card right after active sessions, showing each phrase, its score and a score bar, so that I see what's slipping.
22. As the user, I want tapping a weak phrase to open practice preselected with that phrase, so that I can fix it immediately.
23. As the user, I want an "Average score · last 30 days" line chart, so that I see whether my vocabulary is improving over the month.
24. As the user, I want the chart to show today's average as a large colored number, so that I get the headline without reading the line.
25. As the user, I want a "▲/▼ X since <date>" note next to it, so that I see the direction and size of the change.
26. As the user, I want days before I had any scored phrase left empty rather than drawn as zero, so that the line isn't misleading.
27. As the user, I want phrases scored before per-training history existed (MCP-era scores) counted in the trend, so that the average reflects my real vocabulary.
28. As the user, I want a "No practice in the last 30 days" note when there's nothing to draw, so that an empty chart explains itself.
29. As the user, I want a "Chat skills" card averaging Context, Grammar, Vocabulary, Complexity and Naturalness across all completed chat sessions, so that I see my long-term strengths and gaps.
30. As the user, I want the card title to say how many sessions the averages cover, so that I know how much evidence is behind them.
31. As the user, I want the chat skills card hidden until I've completed a chat, so that Home has no empty cards.
32. As the user, I want the removed items (mastery split, due forecast, average score tile, phrases tile) not shown, so that Home stays focused.
33. As the user, I want shimmering placeholders while the summary loads, so that the layout doesn't jump.
34. As the user, I want all numbers to arrive together in one request, so that tiles don't fill in at different moments.
35. As the user, I want Home to refresh its numbers whenever I return to it, so that it reflects sessions I just finished.
36. As the user, I want "API is not responding" when the summary fails, and a "Change API URL or secret" button when my credentials are rejected, so that failures behave as they do today.
37. As the user, I want the dashboard correct in both light and dark system themes, so that it follows my phone.
38. As the user, I want content scrollable past the floating Practice button, so that the last card is never hidden behind it.

## Implementation Decisions

### Progress summary contract (additive)

The progress summary response gains four fields. Existing fields (`dueNow`, `unpracticed`, `week`, `weakest`) and the `tzOffset` query stay unchanged.

```ts
// extends the existing progress summary schema; shape decided while prototyping
total: z.number().int().min(0),                  // all expressions of the user
active: z.object({
  count: z.number().int().min(0),                // all ACTIVE trainings, any type
  latest: z.array(trainingSummarySchema).max(2), // newest first by createdAt
}),
scoreTrend: z.array(z.number().nullable()).length(30), // index 0 = 29 days ago, 29 = today
chatSkills: z.object({
  sessions: z.number().int().min(0),             // COMPLETED chats that have a finalAssessment
  averages: finalAssessmentAveragesSchema.optional(), // absent when sessions = 0
}),
```

- `total` comes from the expression repository's progress counts (it already counts `dueNow` and `unpracticed`).
- `active` reuses the training list query (status ACTIVE, limit 2) plus a count.
- `chatSkills.averages`: per category, the mean of each session's stored final-assessment average. Every session weighs the same, however many messages it had.
- `scoreTrend`: day boundaries in the user's local time from `tzOffset`, the same way `week` is computed. Point `d` is the average vocabulary score at the end of local day `d` (for today: at `now`), over expressions that existed then and had a score at that moment. `null` when no expression had a score. The score of expression E at time T:
  1. The latest SRS effect for E with `at ≤ T` → its `after.score`.
  2. Otherwise, if E has an effect after T → the earliest such effect's `before.score` (may be absent = unscored).
  3. Otherwise → E's current score (covers MCP-era scores that have no history).
  4. Excluded if E was created after T.
- The prototype rebuilt this on the phone with one history request per phrase. That doesn't scale and is not carried over; the API computes it from one read of the user's expressions plus one read of the SRS effects for the last 30 days (a new trainings-repository query alongside the existing effects-between read, returning expressionId, before/after score and `at`).
- Where it helps readability, this aggregation can live in a pure function (effects + expressions + day boundaries → 30 values), mirroring how the chat aggregator is separate from its handler.

### Home screen layout

All colors are existing theme tokens (dynamic light/dark). Sizes are points. Spacing tokens: `sm` 8, `md` 16.

**Header** (native stack header, shown, empty title)
- Left toolbar: one icon button `gearshape` → Settings.
- Right toolbar: `books.vertical` → Vocabulary list, `clock.arrow.circlepath` → Sessions. Rendered as one capsule group by the native toolbar, as in issue 31.
- No large title. Pushed screens show a chevron-only back button (what the prototype produced).

**Scroll body**: vertical scroll, content inset adjusted automatically under the header, padding `md`, gap `md` between blocks, bottom padding enough to scroll the last card fully above the Practice button (safe-area bottom + ~100).

**Card** (shared by blocks 3–6): background `bubble`, corner radius 14, padding 14, gap `sm`. Title: 17pt, weight 600, `text` color.

**Block 1: count tiles.** Row, two equal tiles, gap `sm`. Tile: background `bubble`, radius 14, padding 14, gap 4.
- Value line: count at 30pt / 700 / tabular numbers, followed inline by " / {total}" at 18pt / 500 / `muted`.
- Label below: 12pt `muted`.
- Due today: count color `warn`; the whole tile is tappable → vocabulary list with due filter on.
- Never practiced: count color `text`; not tappable.
- Loading: a skeleton block (~40×34) in place of the value line; the label is still shown.

**Block 2: weekly chart.** Card with no title of its own; the existing week chart component supplies its heading "Expressions trained this week". Bar area height 90 (today 120, −25%); the component gains an optional bar-height setting that defaults to 120 so other uses don't change. Today's column stays highlighted in `ok`. Loading keeps the chart's existing skeleton bars, scaled to the new height.

**Block 3: active sessions.** Hidden when `active.count` is 0.
- Header row, tappable, space-between: "Active sessions ({count})" in card-title style + "›" at 22pt `muted`. Tap → Sessions with the Active status filter preselected.
- Below: the existing training row component for each of `active.latest` (max 2), without the "⋯" session menu. Tapping a row resumes it (the row's existing behavior).

**Block 4: weakest phrases.** Hidden when `weakest` is empty.
- Title "Weakest phrases".
- One row per phrase, rows gap `sm`. Row: first line is the phrase (flex, one line, truncated) and its score (12pt, colored by the existing score color rule) spaced apart; second line is the existing 6pt score bar; gap 4.
- Tap row → practice screen with that expressionId (today's behavior).

**Block 5: average score chart.** Always shown once loaded.
- Title "Average score · last 30 days".
- Headline line: latest non-null value from `scoreTrend`, formatted to 1 decimal at 22pt / 700, colored by the score color rule. Then, only when there are ≥2 non-null points, 12pt `muted` text "  ▲ {Δ} since {date}". Use ▲ when latest ≥ first non-null value, ▼ otherwise. Δ is the absolute difference to 1 decimal. Date is the day of the first non-null point, short month + day in the device locale (e.g. "25 Sep").
- If every point is null: only the 12pt `muted` line "No practice in the last 30 days", still followed by an empty plot.
- Plot row: y-axis column 20 wide, labels "10", "5", "0" at 12pt `muted`, spread top to bottom over the plot height. Then a plot area, flex, height 120.
- In the plot: 3 hairline grid lines in `border` at 0%, 50%, 100% height. The x position of point i is i/29 of the plot width. The y position is (1 − value/10) of the plot height.
- Consecutive non-null points are joined by a 2pt `ok` line (nulls are skipped, not drawn as gaps). Every non-null point gets a 4pt `ok` dot.
- Under the plot, offset to line up with it: "30 days ago" on the left, "Today" on the right, 12pt `muted`.
- No charting dependency. The prototype draws the line from rotated Views; an SVG-free approach like that is fine.

**Block 6: chat skills.** Hidden when `chatSkills.sessions` is 0.
- Title "Chat skills · {n} session" / "sessions", pluralized correctly. The prototype's "all 1 sessions" is wrong.
- One row per category, in the order Context, Grammar, Vocabulary, Complexity, Naturalness (the same labels as the averages line on ended trainings).
- Row: label 13pt, 90 wide | score bar, flex | score 13pt / 600, 30 wide, right-aligned, colored by the score color rule. Gap `sm`.

**Practice button** (floating, above the scroll view): centered horizontally, bottom = safe-area bottom + 24. Pill shape, background `ok`, padding 14 vertical / 32 horizontal. Shadow: `shadow` color, opacity 0.25, radius 10, offset (0, 4). Label "▶︎  Practice" in 17pt / 700 `onAccent`.
- Tap → native iOS action sheet, title "Start practice".
- Options: "💬  Chat · {chatTargets} phrases", "🗣️  Describe it · {describeTargets} phrases", "🎒  Smuggle · {smuggleTargets} phrases", "Cancel".
- Counts come from settings, with the default settings as a fallback while settings load.
- Choosing a mode → practice screen with that mode.

**States**
- Loading: the tiles and week chart show skeletons (as in issue 32). Blocks 3–6 don't render until the summary arrives. They all come from one response, so they appear together.
- Error, not auth: "API is not responding" in `error` color in place of the tiles; the rest is hidden.
- Unauthorized: "Change API URL or secret" button at the top of the scroll body → setup (today's behavior).
- Refetch on focus, as today.

**Removed from Home**: the centered "N due today / never practiced" text, both rows of plain buttons, the hidden-header layout, and the mastery / forecast / average-score / phrases blocks explored in the prototype.

### Sessions screen

- Accepts an optional `status` route param. When it's a valid training status, it is the initial status filter, so Home can link to "Active". Invalid or missing means today's default (All). The chips still change the filter afterwards.

### Prototype code

- The prototype switcher, the variant components, variants A and C and the `?variant=` handling must not land on main. Rewrite the layout properly in the Home screen and small components; don't promote the prototype module.

## Testing Decisions

- Good tests assert observable behavior at a public boundary (HTTP response, rendered text/press → navigation) and never internal calls or private state. No network or database in tests.
- **API, TDD, one seam:** the progress summary handler, invoked in-process through the app with in-memory repositories and a fixed clock, extending the existing progress summary test file. Cases:
  - `total` counts all of the user's expressions only.
  - `active.count` counts every ACTIVE training while `latest` holds the 2 newest, newest first.
  - `chatSkills` averages only COMPLETED chats with a final assessment, each session weighted equally, and has no averages when there are none.
  - `scoreTrend` has length 30 and puts nulls before the first scored day.
  - An effect's `after.score` applies from its day on.
  - A phrase whose first effect is later uses that effect's `before.score` for earlier days.
  - A scored phrase with no effects (MCP-era) counts on every day since its creation.
  - Local-day bucketing respects `tzOffset` (mirror the existing `week` tz tests).
- If the trend algorithm is extracted as a pure function, unit-test it directly with the same cases. The handler test then needs only one trend case.
- Contract: the summary schema parses the new shape, and a response missing the new fields is rejected (the app decodes with the schema).
- **App, pragmatic:** extend the existing home screen test (mocked API client):
  - tiles render "3" and "/ 5"
  - Due tile press → due-filtered vocabulary
  - Active header shows the exact count, renders at most 2 rows, and its press navigates to Sessions with status ACTIVE
  - chat skills and active cards hidden when empty
  - "No practice in the last 30 days" shown for an all-null trend
  - Practice press opens a sheet without Gaps (mock the action sheet and assert its options, then that choosing Describe it navigates with mode describe)
- Sessions screen: a `status=ACTIVE` param preselects the Active chip and requests only active trainings (existing training-list test style).
- The week chart's bar-height setting is covered by extending its existing test.
- Verify in the iOS Simulator (iPhone 13 Pro, local API + local docker Mongo), light and dark: layout order, sizes, tap targets, sheet contents and scroll clearance above the Practice button.

## Out of Scope

- Mastery distribution, due forecast, a vocabulary-size tile, streaks and any other analytics (PRD out of scope: "rich analytics dashboard").
- Removing Gaps anywhere other than the Home practice sheet.
- Making "Never practiced" tappable (the list has no practiced filter in the app yet).
- Interactive chart features (tap for a day's value, range switch).
- Any change to SRS math, the weakest-phrases rule or the week chart's counting.
- Android / non-iOS action sheet fallback.

## Further Notes

- The prototype put the variant switcher pill at the bottom; ignore it and the "PROTO" label in screenshots.
- In the prototype the Home scroll view sometimes opened already scrolled down after a relaunch. It wasn't reproduced reliably. Check that Home opens scrolled to the top on a cold start.
- Fast Refresh didn't apply edits in the simulator during prototyping; relaunch the app via the dev-client deep link to see changes.
- Replaces the Home layout from issues 26 and 32 (their data and skeleton behavior carry over).
