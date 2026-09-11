# AbenzaGym: a training notebook with a point of view

## Product decisions

Prioritize a focused workout, accessible previous performance, calendar
navigation, plate loading, and sharing routines without personal records.
The brand artwork and implementation are original to AbenzaGym.

## Visual direction

- Court blue #244CE8: primary actions and the training panel.
- Chalk #F5F6FA: light canvas; white #FFFFFF for input surfaces.
- Midnight blue #111B35: dark canvas, with #1B2948 surfaces.
- Sky #A9C8FF: dark-mode action color; ink #17233D for light-mode text.
- Manrope: locally hosted body/interface text. Barlow Condensed Bold:
  athletic display headings, numerals, and the wordmark. Both use OFL licenses.
- The logo is an original split A with a bar through its stance. Named SVG
  groups allow a future staged reveal without changing its geometry.

The first proposal repeated the old orange-on-black card dashboard. Rejected:
changing a logo would not fix hierarchy. The revised direction gives one
large blue training surface priority, with an open calendar and compact tool
rows around it. No motivational filler, decorative charts, or fabricated data.

## Flow

    AbenzaGym                                 settings
    Entrenar                         today's date
    [ Today / planned / completed week strip       ]
    [ Blue training panel: next routine or setup   ]
    [ Start                                      ]
    [ Training tools ]  [ Exercise library        ]
    This week                     Recent sessions
    Entrenar | Plan | Historial | Progreso

Mobile uses a single readable column; wide screens split training and recent
activity. Saved routines lead the Plan screen. Catalogs and import are
secondary actions. During training, focus mode shows one exercise with
explicit previous/next navigation; list mode remains available. The calendar
filters history by local date. Progress explains counts by exercise group,
without claiming to estimate physiological recovery.

## Delivery order

1. Brand sources, self-hosted type, tokens, and generated PWA icons.
2. Tested calendar, workload, plate-loading, and portable-routine logic.
3. Dashboard, plan management, workout focus, tools, calendar, and insights.
4. Browser critique, regression fixes, release documentation and deployment.

Keep all storage keys, backup format, IDs, URL base, and the existing origin.
Commit each verified phase in English. Build and inspect the final result on
mobile and desktop, including keyboard focus, empty states and a saved workout.
