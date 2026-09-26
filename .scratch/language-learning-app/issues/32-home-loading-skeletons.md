# 32: Home loading skeletons

**What to build:** On first open Home shows only the menu; progress, weakest phrases and week chart pop in ~0.5–1s later with a layout jump. Show placeholder shapes with an animated shimmer while `/progress/summary` is pending.

- `src/components/skeleton.tsx`: rounded block (`colors.border`) with a highlight band looping left→right via `Animated` (native driver). No new deps.
- `app/index.tsx`: while `summary.isPending`, skeletons for "N due today" + "never practiced" lines, "Weakest phrases" heading + 3 rows (text, score, bar), and `<WeekChart loading />`.
- `src/components/week-chart.tsx`: `loading` variant — real heading + day labels, skeleton bars of fixed varied heights, same layout as loaded.

- [x] app tests: home pending → skeletons, no "due today"; resolved → skeletons gone. WeekChart loading renders day labels + skeletons.
- [x] sim: cold open shows shimmering placeholders (light + dark), no layout jump when data arrives.
