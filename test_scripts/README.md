# Test scripts

Scripts used to check the site before pushes. Most are kept for reference and won't be needed again.
Nothing here is served by the site (Cloudflare only publishes `site/` and `functions/`).

They use Playwright (pre-installed in the AI workspace) and the demo seed accounts from `scripts/build_seed.py`.
Run them from the project folder with `NODE_PATH=$(npm root -g)`. Output and test stores go in `test_scripts/work/`, which git ignores.
Older scripts were written for earlier versions of the site, so some no longer match the current pages.

## The main ones

| Script | What it checks |
| --- | --- |
| `run6.sh` → `t6.js` | Full flow on `server/node-server.js` with a fresh store: signup, selling with photos, chat, bids, deleting, phone layout. |
| `rb.mjs` | Rebuilds the index from `records/` and `data/` and compares it with `fixtures/before.json`. Run right after `run6.sh`. |
| `run7.sh` → `t7.js` | Same flow on Cloudflare (`wrangler pages dev`). Needs `work/wt` with wrangler installed and fresh copies of `site functions server workers`. |
| `t37.js` | Every code file loads from the versioned `/v/<version>/` address, on desktop and phone. |
| `t38.js`, `t39.js`, `t44.js` | Adding an email in account settings, the code, and what happens when sending fails. |
| `t43.js` | Listing page photos: hover arrows, arrow keys, thumbnails, description placement. |
| `t45.js`, `t46.js` | profile3 header (Log out only), side menu, Saved page, log out. |
| `t41.js`, `t47.js` | Phone bars and header layout. |
| `t25.js`, `t27.js` | Email codes and two-step login (start the server with `EMAIL_LOG=1`). |
| `t21.js`, `t21-seed.mjs`, `t22.mjs` | Admin site inbox and email parsing (`fixtures/mail/`). |
| `t32.js`, `t40.js`, `t48.js` | Other profiles, using a copy of the site with `DEFAULT_PROFILE` changed, on port 8792. |
| `t8.js` | Phone layout audit. Needs a fresh store. |
| `t51.js` | profile3 phones: square magnifying-glass button and the waffle slide-out menu. |
| `t49.js`, `t50.js` | Map page, Map button, DEMO tag, example businesses, and the pickup pin on the sell and edit forms (`t50.js` for other profiles). Map tiles can't load in the test box, so these check pins and saving. |

## Other files

- `t*.js` not listed above: checks from earlier changes (search, sell form, auth pages, sidebar, logo, field styles, editing).
- `d*.js`, `dbg.mjs`: one-off debugging.
- `idx-dump.mjs`, `mig-count.mjs`, `local-sd.mjs`: dump or count index rows in a local `index.sqlite`.
- `softdelete.js`: the SQL steps used once to move the old demo listings into backups. Don't run it against live data without the owner's approval.
- `wf-test.mjs`, `wf2.mjs`: word filter checks.
- `fixtures/`: test photos, a PDF, sample emails, and the index snapshot `rb.mjs` compares against.

## From now on

Put new test scripts here when they're done, and mention them in the table if they're worth reusing.
