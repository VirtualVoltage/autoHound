#!/bin/bash
# Starts server/node-server.js on port 8791 with a fresh test store, runs setup, and makes "redline riley" an admin.
# Usage: source test_scripts/fresh-store.sh   (sets NP to the server's process id; extra env like EMAIL_LOG=1 passes through)
R=/home/claude/autohound; W=$R/test_scripts/work
rm -rf $W/store; mkdir -p $W/store $W/out
(cd $R && AUTOHOUND_DIR=$W/store PORT=8791 node --no-warnings server/node-server.js > $W/node.log 2>&1 &)
for i in $(seq 1 20); do curl -s -o /dev/null --noproxy '*' http://127.0.0.1:8791/ && break; sleep 0.5; done
for i in $(seq 1 60); do curl -s --noproxy '*' -m 60 -X POST http://127.0.0.1:8791/api/setup | grep -q '"done":true' && break; done
F=$(grep -rl '"username": *"redline riley"' $W/store/records/accounts --include=account.json | head -1)
python3 -c "import json,sys; f=sys.argv[1]; j=json.load(open(f)); j['admin']=True; json.dump(j,open(f,'w'),indent=2)" "$F"
NP=$(pgrep -f "node --no-warnings server/node-server.js" | head -1)
echo "test store ready (server $NP)"
