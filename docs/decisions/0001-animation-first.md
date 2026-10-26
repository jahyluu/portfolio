# 0001 — Build the scroll animation first, as a grey-box prototype

**Date:** 2026-10-26

**Decision:** Build the camera path and scroll animation before content, styling or backend,
using simple boxes in place of real models.

**Why:** The animation is the longest and riskiest part. Grey boxes let the camera motion and
scroll timing be tuned without waiting on assets, and swapping boxes for models later does not
change the animation code. Project descriptions are short and can be written at any time.

**Consequence:** The site is not shared with recruiters until content is in (build step 6).
The current jahyluu.dev stays live until then.
