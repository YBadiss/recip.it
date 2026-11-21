#!/bin/bash
# Uploads the already-built dist/ (CI runs `npm run build` before loading the SSH key), installs runtime
# dependencies on the droplet and (re)starts the API under PM2 from the new directory.
set -euo pipefail

SERVER="${DEPLOY_USER:-root}@${DEPLOY_HOST:-167.71.143.97}"
BASE=/var/www/recip.it
ENV_FILE="${RECIPIT_ENV_FILE:-/root/recip.it/backend/.env}"
timestamp=$(date +%s)
DIR="$BASE/backend-$timestamp"

[ -d dist ] || { echo "dist/ not found: run npm run build first" >&2; exit 1; }

ssh "$SERVER" "mkdir -p $DIR"
scp -r dist/* package.json package-lock.json "$SERVER:$DIR/"
ssh "$SERVER" "ln -s $ENV_FILE $DIR/.env && cd $DIR && npm ci --omit=dev --no-audit --no-fund"
ssh "$SERVER" "ln -sfn $DIR $BASE/backend"

# Start from the new directory: `pm2 restart` would keep running the old one (dotenv reads .env from the cwd).
# `pm2 save` so the process comes back after a reboot.
ssh "$SERVER" "pm2 delete recipi-backend >/dev/null 2>&1 || true; cd $DIR && pm2 start index.js --name recipi-backend && pm2 save"
ssh "$SERVER" "sleep 2 && pm2 logs recipi-backend --lines 20 --nostream"

ssh "$SERVER" "cd $BASE && ls -d backend-[0-9][0-9][0-9]* | sort -t- -k2 -n | head -n -3 | xargs -r -t rm -rf --"
