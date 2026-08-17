# Landing page vault

The public landing page for Arena Lounge (https://arsalanrc.github.io/arena-lounge/)
lives here until the DoraHacks submission closes (4 Sept 2026): Arsalan does not
want the idea and plan public before the deadline, so the portfolio repo serves a
teaser at that URL and this folder keeps the real page.

Contents: `index.html` (the full page in decentraland.org's design language, EN + DE,
credit line at the bottom), `screenshots/` (hero at 1920 and 3840 wide, stitched
from sixteen narrow-FOV Explorer captures for a crisp marquee, plus the card shots).

To publish after the submission: copy `index.html` and `screenshots/` to
`~/Development/ArsalanRC.github.io/arena-lounge/`, replacing the teaser, then
branch, PR, merge there.

The hero re-render recipe (needs the desktop Explorer + MCP): `tools/dev/hero-stitch/capture_tiles.py`
takes sixteen 18-degree tiles from one camera position, `stitch.py` reprojects them
into one 3840x2400 frame (numpy + PIL). Run both from the repo root.
