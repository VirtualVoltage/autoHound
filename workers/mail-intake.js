// Cloudflare Email Worker for autohound.online. Email Routing sends support@ and every other address here.
// It only queues the raw email in D1. The site saves it into records/inbox and data/inbox (server/mail.js).
// Deployed by hand as the "autohound-mail" Worker with a D1 binding named DB to autohound-index. It isn't part of the Pages site.
const MAX_BYTES = 1400000;
export default {
  async email(message, env) {
    const reader = message.raw.getReader(), chunks = [];
    let total = 0, truncated = false;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (total + value.byteLength > MAX_BYTES) { chunks.push(value.subarray(0, MAX_BYTES - total)); total = MAX_BYTES; truncated = true; await reader.cancel(); break; }
      chunks.push(value); total += value.byteLength;
    }
    const raw = new Uint8Array(total);
    let at = 0; for (const c of chunks) { raw.set(c, at); at += c.byteLength; }
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS mail_queue(id INTEGER PRIMARY KEY AUTOINCREMENT, received INTEGER NOT NULL, mail_from TEXT, rcpt_to TEXT, raw BLOB NOT NULL, size INTEGER, truncated INTEGER NOT NULL DEFAULT 0, email_id TEXT)').run();
    await env.DB.prepare('INSERT INTO mail_queue(received,mail_from,rcpt_to,raw,size,truncated) VALUES(?,?,?,?,?,?)')
      .bind(Date.now(), message.from, message.to, raw.buffer, message.rawSize || total, truncated ? 1 : 0).run();
  },
};
