// Same steps as the site's "Delete listing" button (changeStatus + closeListingConversations), as SQL.
async function softDeleteDemo(q) {
  const DEMO = ['A.26.09.12.00000','A.26.09.18.00000','A.26.09.27.00000','A.26.10.03.00000','A.26.10.11.00000'];
  const ls = await q(`SELECT id, path FROM listings WHERE status='live' AND created < '2026-11-04' AND account_id IN (${DEMO.map(d => `'${d}'`).join(',')}) ORDER BY id`);
  const pre = (col, p) => [`substr(${col},1,length(?)) = ?`, [p + '/', p + '/']];
  const log = [];
  for (const l of ls) {
    const lj = l.path + '/listing.json';
    const ch = await q(`UPDATE vfs SET bytes = CAST(replace(CAST(bytes AS TEXT), '"status": "live"', '"status": "deleted"') AS BLOB) WHERE path = ? AND instr(CAST(bytes AS TEXT), '"status": "live"') > 0`, [lj]);
    const ok = (await q(`SELECT instr(CAST(bytes AS TEXT), '"status": "deleted"') > 0 AS d FROM vfs WHERE path = ?`, [lj]))[0]?.d;
    if (!ok) { log.push(`${l.id}: listing.json not updated, stopped`); break; }
    await q(`UPDATE listings SET status='deleted' WHERE id = ?`, [l.id]);
    const cs = await q(`SELECT * FROM conversations WHERE listing_id = ? AND status = 'live'`, [l.id]);
    for (const c of cs) {
      const day = c.id.slice(2, 10), root = `backups/conversations/${day}__conversations/${c.id}__${c.seller_id}_${c.buyer_id}`;
      const to = `records/${root}/active`, dataTo = `data/${root}_attachments/active`;
      let [w, p] = pre('path', c.path);
      await q(`UPDATE vfs SET path = ? || substr(path, length(?) + 1) WHERE ${w}`, [to, c.path, ...p]);
      await q(`INSERT OR REPLACE INTO vfs(path, bytes) SELECT ?, bytes FROM vfs WHERE path = ?`, [to + '/listing.snapshot.json', lj]);
      if (c.data_path) { [w, p] = pre('path', c.data_path); await q(`UPDATE vfs SET path = ? || substr(path, length(?) + 1) WHERE ${w}`, [dataTo, c.data_path, ...p]); }
      await q(`UPDATE conversations SET status='closed', path=?, data_path=? WHERE id=?`, [to, dataTo, c.id]);
      if (c.data_path) await q(`UPDATE files SET path = ? || substr(path, length(?) + 1) WHERE conversation_id = ?`, [dataTo, c.data_path, c.id]);
      log.push(`${l.id}: chat ${c.id} moved to ${to}`);
    }
  }
  return { deleted: ls.length, log };
}
