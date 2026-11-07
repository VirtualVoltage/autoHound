#!/bin/bash
mkdir -p /home/claude/autohound/test_scripts/work/shots /home/claude/autohound/test_scripts/work/store && cp /home/claude/autohound/test_scripts/fixtures/{up_a.jpg,up_b.jpg,doc.pdf} /home/claude/autohound/test_scripts/work/shots/
cd /home/claude/autohound/test_scripts/work/wt; export WRANGLER_SEND_METRICS=false CI=1
npx wrangler pages dev site --port 8799 --ip 127.0.0.1 > dev.log 2>&1 &
SP=$!
node --no-warnings /home/claude/autohound/test_scripts/t7.js /home/claude/autohound/test_scripts/work/shots 2>&1
grep -E ' 5[0-9][0-9] ' dev.log | cut -c1-120 | sort | uniq -c | head -5; grep -iE 'error|exception' dev.log | head -8 | cut -c1-220
kill $SP
for p in $(ps -eo pid,comm,args | awk '$2 ~ /^(node|workerd)$/ && /wrangler|workerd/ {print $1}'); do kill $p 2>/dev/null; done
