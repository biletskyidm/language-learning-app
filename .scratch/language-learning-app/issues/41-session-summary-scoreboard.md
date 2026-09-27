# 41: Session summary scoreboard

**Problem:** The final assessment is a plain text panel: averages as one text line, then three text sections. It does not look like the message assessment preview (#40), so the same scores read differently across the training.

**Solution:** Render the final assessment inline as a scoreboard card that looks like the #40 preview card. The rows show scores only and cannot be tapped.

## Layout

- Card: radius 20, `colors.surface`, soft shadow (same as #40). No blur or modal; the card stays inline where `SessionSummary` is today.
- Hero: overall score = mean of the 5 averages (1 decimal, 34pt heavy, score color). Score only, no text next to it.
- Rows: Context, Grammar, Vocabulary, Complexity, Naturalness, then a "Targets" heading with one row per `finalAssessment.targets` entry. The row look matches #40 (label 120pt, `ScoreBar`, integer score in score color, hairlines) but has no `+`/`−` and is not pressable.
- Sections after rows: "Strengths", "To work on", "Focus next", each with a heading in the same style as "Targets" and always shown.
- Active chat screen: 16pt side margins, card capped at 50% of the screen height. The content scrolls inside with the same edge fades as #40.
- History screen: no cap (the page already scrolls); the body padding supplies the margins.

## Decisions

- Move the #40 scroll-with-fades code and the row look into a shared module. `AssessmentPreview` keeps its behavior.
- `AveragesLine` stays; the training list and chat skills still use it.

**Out of scope:** API, final-assessment prompt or data shape, message preview behavior.

- [x] app tests: hero shows mean score; every category and target row renders label + score; the three sections render; rows are not buttons.
- [x] Sim (iPhone 13 Pro, light + dark): chat and history show the card; the chat card is capped with fades when content overflows; the #40 preview still works.
