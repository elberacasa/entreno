# AbenzaGym brand source

`abenzagym-mark.svg` is original vector artwork, with a 120 × 120 view box.
Its three named groups (`stance-left`, `stance-right`, `lifting-bar`) are
stable animation targets. The resting image needs no scripts or animation.
Use transforms/opacity on wrappers for future motion and honor reduced motion.

The React Native SVG component mirrors these coordinates for themed rendering.
`npm run icons` generates PWA icons directly from this source. Font files and
their OFL licenses live in `public/fonts`; the app makes no remote font requests.
