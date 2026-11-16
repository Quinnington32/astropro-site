# Housing photo tools

Used to add verified top-3 picks to `src/data/housing.json`.

1. `python3 scripts/housing/grab.py <key> <property-website> [n]` downloads up to n usable photos (>=800px wide, landscape) from the property's own site into `/tmp/cand/<key>/`. View them (contact sheet) and reject logos, floor plans, stock people and AI renders.
2. In Python: `sys.path.insert(0,'scripts/housing'); from addp import add` then `add(place_prefix, slug, name, website, '/tmp/cand/<key>/N.jpg', pick, summary, alt)` saves `public/assets/housing/<id>.jpg` and writes the property. Run from the repo root.
3. `npm run check`, commit, push to main.

Rules: only official property websites with a real photo of that property. Do not pad small or remote markets.
