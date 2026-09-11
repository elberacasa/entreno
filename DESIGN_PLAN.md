# Entreno upgrade direction

An everyday training companion: open the app, see the next useful action, and record a set with confidence.

- Palette: ink #08090C, equipment grey #191D25, chalk #F4F7FA, readable slate #A2ABBA, Entreno orange #FF5A1F, completion green #2DD46F. Preserve the app's established identity; use orange for action and green for completed work.
- Type: the platform's system sans for clear mobile reading, bold compact headlines, tabular workout numbers. Sentence-case section labels; no decorative overlines.
- Layout: left-aligned mobile training desk. A compact brand/date header, seven-day activity strip, one prominent workout or onboarding panel, then recent work. Wide screens retain a readable centered column.
- Workout: previous performance close to editable sets, named controls, optional effort detail, save feedback, and an explicit completion recap.
- Review: retain familiar orange instead of choosing a new generic fitness palette. Replace the repeated zero-stat cards with an actionable first-use panel and real weekly activity. No decorative animations or promotional hero imagery in a working logger.

Home structure:

    Entreno                         Settings
    Today's date / training headline
    M  T  W  T  F  S  S  [activity]
    [Resume / next routine / find a plan]
    [Weekly results when available]
    Recent training
    Today | Routines | History | Progress

Engineering: validate persisted boundaries, save a complete versioned snapshot atomically, retain legacy data during migration, isolate pure workout calculations, test recovery and domain behavior, and gate production builds with checks.
