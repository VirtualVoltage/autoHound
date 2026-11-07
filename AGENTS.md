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

- Everything visual lives in `site/profiles/`, including page HTML in `views.js`. Each profile has a `desktop` and a `mobile` folder, usually changed together, with small differences to suit each. `site/js/profile.js` picks the active profile and loads `mobile` on phones. Tablets get `desktop`. Shared logic in `site/js` must not write page HTML. `profile1` is the original look. `profile3` is the active look: profile2 plus a side menu (Browse market, My listings, Account settings) under the header line on main pages, not on log in, sign up or code pages. `profile2` is the earlier look: neon colors, a simple marketplace layout, every action a real button, buttons at the top right on desktop and in a bottom bar on mobile. Visitors can't switch profiles.
- `profile1` theme: black and neon green, early 2000s tuner. White text and titles, green main title and prices, yellow towns, gray counts.
- Text goes in `records/`. Photos, videos and PDFs go in `data/`, using the same layout.
- IDs look like `L.26.11.04.00000`. Folder names are `ID__title`, and `__` only ever separates the two. Titles use `_` for spaces in folder names.
- People see titles with spaces and never see IDs in page text. Usernames can have spaces but never `_`, at signup or login. Folder names store their spaces as `_`.
- People log in with their email. Accounts without one can use their username. New passwords use a random `client_salt` in `private.json`; older accounts keep their username-based salt so they still work. Unknown emails get a made-up salt so the login page can't reveal who has an account. Usernames can't contain `@`.
- Two-step login (an emailed 6-digit code) is optional, off by default, and switched in account settings. It's saved as `"login_codes": true` in `account.json`, needs a confirmed email, and is skipped if the site can't send email, so nobody gets locked out.
- Usernames are 6 to 40 characters. Passwords are 6 to 15. Signup needs an email, saved as typed in `account.json` and the index. It skips the username rules, but can't have spaces. One account per email, ignoring capitals. Emails are private: only the owner sees theirs. After signup the site emails a 6-digit code from support@autohound.online (`server/verify.js`), and confirming it sets `"email_verified": true` in `account.json`. Codes are hashed, last 15 minutes and allow 5 guesses. Sending uses Resend once the `RESEND_API_KEY` secret exists. Until then signup still works and the site says codes are off.
- Accounts sort into `A` to `Z` folders, plus `_other`. Other crowded folders sort by date with a generic title.
- The search index must always be fully rebuildable from `records/` and `data/`.
- Chats live under the listing. Each person has their own `.jsonl` file, and an attachment is its own line. The template is `attachment, id, text, time`.
- After 7 days with no message, a chat moves to the next `backupN`, and each new message resets the timer. Sold or removed listings keep their chat in both inboxes until then.
- Sold or removed listings move to `records/backups/listings/<date>__listings/` and the matching `data/` folder, sorted by the listing's ID date. Their chats move out first. Older ones move one per visit, and a move cut off partway finishes on a later visit.
- Public text (usernames, listings, and any future comments) goes through `server/wordfilter.js`. By the owner's decision it blocks only the hard-R slur, including look-alike, stretched and spaced-out spellings. All other words are allowed. Private chats are never filtered.
- An account is an admin only while its `account.json` has `"admin": true`. It's toggled by hand, never by the site. Admins see the site inbox in the menu and at the top of the home page.
- Email sent to any @autohound.online address goes to the site's own inbox. The `autohound-mail` Worker (`workers/mail-intake.js`, deployed by hand) puts it in `mail_queue`, and `server/mail.js` saves it as `records/inbox/<date>__inbox/E.ID__Subject/message.json` plus `message.eml` in the matching `data/` folder. Email is shown as plain text only, never as HTML.
- Chats for live listings happen in the chat box on the listing page in every profile; sellers pick a buyer there. Sold or removed listings keep their chat page.
- Features belong to every profile: logic in `server/` and `site/js`, with matching views in each profile. Only layout choices, like profile3's side menu and header buttons, are profile-specific.
- Owners can edit a live listing's words, price and details, but not photos, type or category. A new title renames its folder, and its chats and photos move with it. Auctions with bids keep their price.
- Auction pages never show buyers a market value comparison.
- The home page shows popular listing windows, with only search and price filters.

## Viewing the site

The owner watches the live site in the Claude desktop app's browser pane. The old sample preview artifact is retired. `scripts/build-preview.mjs` still works if a sample preview is ever wanted.

## Before a real launch

Replace the sample photos, check the AUTOHOUND trademark, turn on R2, set up off-site backups, strengthen password hashing, add a password reset, review posts,.
