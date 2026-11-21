#!/bin/bash
# Uploads the already-built dist/ to the droplet, swaps the live symlink and keeps the 3 latest deploys.
# CI builds (with the VITE_* URLs) in an earlier step, before the SSH key is loaded.
set -euo pipefail

SERVER="${DEPLOY_USER:-root}@${DEPLOY_HOST:-167.71.143.97}"
BASE=/var/www/recip.it
NAME="admin"
timestamp=$(date +%s)

[ -d dist ] || { echo "dist/ not found: build first" >&2; exit 1; }

ssh "$SERVER" "mkdir -p $BASE/$NAME-$timestamp && chmod 755 $BASE/$NAME-$timestamp"
scp -r dist/* "$SERVER:$BASE/$NAME-$timestamp/"
ssh "$SERVER" "ln -sfn $BASE/$NAME-$timestamp $BASE/$NAME"
ssh "$SERVER" "cd $BASE && ls -d $NAME-[0-9][0-9][0-9]* | sort -t- -k2 -n | head -n -3 | xargs -r -t rm -rf --"
