// Search index only. Everything except sessions, limits and mail_queue can be rebuilt from records/ and data/.
export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS system_state(key TEXT PRIMARY KEY, value TEXT)`,
  `CREATE TABLE IF NOT EXISTS counters(key TEXT PRIMARY KEY, n INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY, username TEXT NOT NULL, username_key TEXT NOT NULL UNIQUE, path TEXT NOT NULL, data_path TEXT NOT NULL, photo TEXT, joined TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', email TEXT)`,
  `CREATE TABLE IF NOT EXISTS listings(id TEXT PRIMARY KEY, account_id TEXT NOT NULL, title TEXT NOT NULL, kind TEXT NOT NULL, category TEXT NOT NULL, city TEXT NOT NULL, price INTEGER NOT NULL, description TEXT NOT NULL, photo TEXT, sell_type TEXT NOT NULL, auction_ends INTEGER, bids INTEGER NOT NULL DEFAULT 0, top_bidder TEXT, status TEXT NOT NULL, created TEXT NOT NULL, path TEXT NOT NULL, data_path TEXT NOT NULL, search TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS listings_browse ON listings(status, created)`,
  `CREATE INDEX IF NOT EXISTS listings_price ON listings(status, price)`,
  `CREATE INDEX IF NOT EXISTS listings_account ON listings(account_id)`,
  `CREATE TABLE IF NOT EXISTS conversations(id TEXT PRIMARY KEY, listing_id TEXT NOT NULL, seller_id TEXT NOT NULL, buyer_id TEXT NOT NULL, status TEXT NOT NULL, backups INTEGER NOT NULL DEFAULT 0, path TEXT, data_path TEXT, last_id TEXT, last_from TEXT, last_text TEXT, last_activity INTEGER, seller_read TEXT, buyer_read TEXT, UNIQUE(listing_id, buyer_id))`,
  `CREATE INDEX IF NOT EXISTS conv_seller ON conversations(seller_id, status)`,
  `CREATE INDEX IF NOT EXISTS conv_buyer ON conversations(buyer_id, status)`,
  `CREATE INDEX IF NOT EXISTS conv_activity ON conversations(status, last_activity)`,
  `CREATE TABLE IF NOT EXISTS files(id TEXT PRIMARY KEY, path TEXT NOT NULL, ext TEXT, owner_account TEXT, listing_id TEXT, conversation_id TEXT)`,
  `CREATE TABLE IF NOT EXISTS reports(listing_id TEXT NOT NULL, account_id TEXT NOT NULL, PRIMARY KEY(listing_id, account_id))`,
  `CREATE TABLE IF NOT EXISTS inbox(id TEXT PRIMARY KEY, path TEXT NOT NULL, data_path TEXT NOT NULL, from_addr TEXT, to_addr TEXT, subject TEXT, received TEXT NOT NULL, unread INTEGER NOT NULL DEFAULT 1, preview TEXT)`,
  `CREATE INDEX IF NOT EXISTS inbox_received ON inbox(received)`,
  // Emails waiting to be saved into records/inbox. Filled by the mail intake worker, emptied by processMailQueue.
  `CREATE TABLE IF NOT EXISTS mail_queue(id INTEGER PRIMARY KEY AUTOINCREMENT, received INTEGER NOT NULL, mail_from TEXT, rcpt_to TEXT, raw BLOB NOT NULL, size INTEGER, truncated INTEGER NOT NULL DEFAULT 0, email_id TEXT)`,
  `CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL, expires INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, n INTEGER NOT NULL)`,
];
// Changes for databases made before a column existed. Each one may fail harmlessly if it was already applied.
export const MIGRATIONS = [
  `ALTER TABLE accounts ADD COLUMN email TEXT`,
];
// Indexes that need a migrated column.
export const AFTER_MIGRATIONS = [
  `CREATE UNIQUE INDEX IF NOT EXISTS accounts_email ON accounts(lower(email))`,
];
export const REBUILDABLE_TABLES = ['accounts', 'listings', 'conversations', 'files', 'reports', 'inbox'];
