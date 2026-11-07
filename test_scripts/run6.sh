#!/bin/bash
mkdir -p /home/claude/autohound/test_scripts/work/shots /home/claude/autohound/test_scripts/work/store && cp /home/claude/autohound/test_scripts/fixtures/{up_a.jpg,up_b.jpg,doc.pdf} /home/claude/autohound/test_scripts/work/shots/
cd /home/claude/autohound; rm -rf /home/claude/autohound/test_scripts/work/store; mkdir -p /home/claude/autohound/test_scripts/work/store
AUTOHOUND_DIR=/home/claude/autohound/test_scripts/work/store PORT=8791 node --no-warnings server/node-server.js > /home/claude/autohound/test_scripts/work/node.log 2>&1 &
SP=$!
for i in 1 2 3 4 5 6 7 8 9 10; do curl -s -o /dev/null --noproxy '*' http://127.0.0.1:8791/ && break; done
node --no-warnings /home/claude/autohound/test_scripts/t6.js /home/claude/autohound/test_scripts/work/shots http://127.0.0.1:8791 /home/claude/autohound/test_scripts/work/store 2>&1
kill $SP
echo '--- server log'; tail -5 /home/claude/autohound/test_scripts/work/node.log | cut -c1-300
