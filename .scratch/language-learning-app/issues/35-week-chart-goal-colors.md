# 35: Week chart goal colors

**What to build:** Home week chart bars are all grey except today's (green). Color each bar by a hardcoded daily goal of 3 expressions instead.

- `src/components/week-chart.tsx`: `GOAL = 3`. Days up to and including today: count ≥ 3 → `colors.ok`, < 3 → `colors.error`. Future days stay grey (`colors.border`). Today's day label keeps its green bold highlight.

- [x] app tests: `week=[3,1,0,5,…] today=2` → Mon green, Tue red, Wed (today, 0) red, Thu grey.
- [x] sim: home shows green/red past bars, grey future bars (light + dark).
