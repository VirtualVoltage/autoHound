# Autohound

Local marketplace for car parts, project cars and auctions. Demo stage.

## Layout

```text
site/      Pages and scripts the browser loads
  profiles/profile1/   The original look and layouts: site.css, views.js, img/
  profiles/profile2/   The active look: same neon, simple marketplace layout, real buttons
server/    Code that reads and writes accounts, listings and chats
functions/ Connects the server to Cloudflare
scripts/   Index rebuild and demo account builder
```

## Visual profiles

Each folder in `site/profiles/` is one complete look for the site, including page layouts. Change the name in `site/js/profile.js` to switch. See `site/profiles/README.md` to make a new one.

## Stored files

`records/` holds text and `data/` holds photos, videos and PDFs. Both use the same layout.

```text
records/accounts/U/A.26.11.04.00000__user_name/
  account.json
  private.json                 hashed password, never sent to visitors
  favorites.json
  listings/L.26.11.04.00000__listing_title/
    listing.json
    bids.jsonl
    reports.jsonl
    conversations/C.26.11.04.00000__sellerID_buyerID/
      conversation.json        includes message_template
      sellerID.jsonl           one message per line
      buyerID.jsonl

data/accounts/U/A.26.11.04.00000__user_name/
  P.26.11.04.00000__profile/original.jpg
  listings/L.26.11.04.00000__listing_title/
    P.26.11.04.00001__photo/original.jpg, thumb.jpg
    conversations/C.26.11.04.00000__sellerID_buyerID_attachments/
      P.26.11.04.00002__attachment/original.jpg
      F.26.11.04.00000__document/original.pdf

records/backups/conversations/26.11.04__conversations/C.26.11.04.00000__sellerID_buyerID/
  active/    chat on a sold or removed listing
  backup1/   chat that went 7 days with no message
  backup2/
data/backups/conversations/26.11.04__conversations/C.26.11.04.00000__sellerID_buyerID_attachments/
  active/, backup1/, backup2/
```

## Rules

- Accounts sort into `A` to `Z` by the username's first letter. Usernames that start with anything else go in `_other`.
- Other folders that could get crowded are split by the date in the ID, with a generic title like `26.11.04__conversations`.
- IDs are type, date, then a daily count: `L.26.11.04.00000`. Types: A account, L listing, P photo, F other file, C conversation, M message.
- Folder names are `ID__title`. `parseName` in `server/ids.js` splits them at the first `__`. Titles use `_` for spaces in folder names, and people only ever see the title with spaces, never the ID.
- Usernames can't contain underscores. Labels and file names can change.
- Message lines follow `message_template`: `[attachment, id, text, time]`. An attachment is its own line.
- Each new message restarts a 7-day timer. The newest message's `time` in the files decides when a chat becomes the next backup.
- The search index can always be rebuilt from `records/` and `data/`. Only logins and rate limits are lost, and those are temporary.

## Run it on your own server

Needs Node 22.5 or newer and no other installs.

```text
npm start                 site on port 8080, files in ./storage
npm run rebuild-index     recreate the search index from the files
```

Set `PORT`, `AUTOHOUND_DIR` and `ADMIN_KEY` to change the defaults. To move off Cloudflare, copy `records/` and `data/` into the storage folder, then rebuild the index.

## Cloudflare

Output folder is `site`. Bindings: `DB` (D1 index) and optionally `FILES` (R2). Without `FILES`, the same paths are kept in a D1 table called `vfs`, and attachments are limited to 1.5 MB. `POST /api/admin/rebuild` stays off until an `ADMIN_KEY` is set.
