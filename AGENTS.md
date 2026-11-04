# Working on Autohound

Autohound is a local marketplace for car parts, project cars and auctions. Read `README.md` for the file layout.

## Treat the site as live

Unless the owner says a big change is coming, act as if real people depend on the site.

- Never wipe, reset or re-seed live data.
- Never delete accounts, listings, chats, files or databases, and never overwrite `private.json`, without the owner's explicit approval. Password hashes can't be rebuilt.
- Back up data before anything that moves or changes stored files, and confirm copies before removing originals.
- Keep existing data working. If stored files need a new format, migrate them instead of starting over.
- Test both versions before pushing: `server/node-server.js` and Cloudflare (`wrangler pages dev`). Include the flows you touched and an index rebuild.
- Pushing to `main` publishes the site right away. Tell the owner before a risky push.
- If you can't confirm something on the live site, say so.

## Rules decided by the owner

- Visual files live in `site/profiles/`, and `site/js/profile.js` picks the active one. `profile1` is the original look.
- `profile1` theme: black and neon green, early 2000s tuner. White text and titles, green main title and prices, yellow towns, gray counts.
- Text goes in `records/`. Photos, videos and PDFs go in `data/`, using the same layout.
- IDs look like `L.26.11.04.00000`. Folder names are `ID__title`, and `__` only ever separates the two. Titles use `_` for spaces in folder names.
- People see titles with spaces and never see IDs in page text. Usernames can't contain `_`.
- Usernames are 6 to 40 characters. Passwords are 6 to 15. There's no email for now.
- Accounts sort into `A` to `Z` folders, plus `_other`. Other crowded folders sort by date with a generic title.
- The search index must always be fully rebuildable from `records/` and `data/`.
- Chats live under the listing. Each person has their own `.jsonl` file, and an attachment is its own line. The template is `attachment, id, text, time`.
- After 7 days with no message, a chat moves to the next `backupN`, and each new message resets the timer. Sold or removed listings keep their chat in both inboxes until then.
- Auction pages never show buyers a market value comparison.
- The home page shows popular listing windows, with only search and price filters.

## Before a real launch

Replace the sample photos, check the AUTOHOUND trademark, turn on R2, set up off-site backups, strengthen password hashing, add a password reset, review posts, and add a word filter for usernames.
