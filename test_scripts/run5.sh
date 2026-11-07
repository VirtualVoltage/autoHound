#!/bin/bash
mkdir -p /home/claude/autohound/test_scripts/work/shots /home/claude/autohound/test_scripts/work/store && cp /home/claude/autohound/test_scripts/fixtures/{up_a.jpg,up_b.jpg,doc.pdf} /home/claude/autohound/test_scripts/work/shots/
cd /home/claude/autohound/test_scripts/work/wt
for p in $(ps -eo pid,comm,args | awk '$2 ~ /^(node|workerd)$/ && /wrangler|workerd/ {print $1}'); do kill $p 2>/dev/null; done
rm -rf .wrangler; cp /home/claude/autohound/public/index.html public/index.html
export WRANGLER_SEND_METRICS=false CI=1
npx wrangler d1 execute autohound-db --local --file schema.sql >/dev/null 2>&1
npx wrangler pages dev public --port 8799 --ip 127.0.0.1 > dev.log 2>&1 &
SP=$!
node /home/claude/autohound/test_scripts/t5.js /home/claude/autohound/test_scripts/work 2>&1
grep -E ' (4|5)[0-9][0-9] ' dev.log | cut -c1-90 | sort | uniq -c | head
kill $SP
for p in $(ps -eo pid,comm,args | awk '$2 ~ /^(node|workerd)$/ && /wrangler|workerd/ {print $1}'); do kill $p 2>/dev/null; done
