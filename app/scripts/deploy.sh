#!/bin/bash
# Uploads the already-built .output/ (CI runs `npm run build` before loading the SSH key) to the droplet and
# (re)starts the app under PM2 from the new directory. Keeps the 3 latest deploys.
set -euo pipefail

SERVER="${DEPLOY_USER:-root}@${DEPLOY_HOST:-167.71.143.97}"
BASE=/var/www/recip.it
# Defaults to the old backend's env file, so JWT_SECRET, DATA_FOLDER and the API keys carry over.
ENV_FILE="${RECIPIT_ENV_FILE:-/home/deploy/secrets/recipit-backend.env}"
NAME=recipit
timestamp=$(date +%s)
DIR="$BASE/app-$timestamp"

[ -f .output/server/index.mjs ] || { echo ".output/ not found: run npm run build first" >&2; exit 1; }

# The server needs node:sqlite (Node >= 22.13) and an env file whose data folder lives outside the deploy
# directories, which are deleted after a few deploys.
ssh "$SERVER" bash -s -- "$ENV_FILE" "$BASE" <<'CHECK'
set -euo pipefail
env_file=$1; base=$2
node -e 'const [maj, min] = process.versions.node.split(".").map(Number); if (maj < 22 || (maj === 22 && min < 13)) { console.error(`Node ${process.version} is too old: node:sqlite needs >= 22.13`); process.exit(1) }'
[ -f "$env_file" ] || { echo "Env file $env_file not found" >&2; exit 1; }
data=$(grep -E '^DATA_FOLDER=' "$env_file" | tail -n1 | cut -d= -f2- | tr -d '"'"'" || true)
if [ -n "$data" ] && [ "${data#/}" = "$data" ]; then
  echo "DATA_FOLDER=$data in $env_file is relative: set an absolute path (e.g. $base/data)" >&2; exit 1
fi
grep -qE '^LLM_MODEL=' "$env_file" || echo "Warning: LLM_MODEL is not set in $env_file, defaulting to openai:gpt-5-mini" >&2
CHECK

ssh "$SERVER" "mkdir -p $DIR"
scp -rq .output "$SERVER:$DIR/"
ssh "$SERVER" "ln -s $ENV_FILE $DIR/.env && ln -sfn $DIR $BASE/app"

# Replace the old Express backend (same port) and any previous app process. DATA_FOLDER defaults to $BASE/data
# when the env file does not set it; node --env-file never overrides variables already in the environment.
ssh "$SERVER" "pm2 delete recipi-backend >/dev/null 2>&1 || true; pm2 delete $NAME >/dev/null 2>&1 || true; \
  cd $DIR && grep -qE '^DATA_FOLDER=' .env || export DATA_FOLDER=$BASE/data; \
  NODE_ENV=production pm2 start .output/server/index.mjs --name $NAME --node-args='--env-file=$DIR/.env --disable-warning=ExperimentalWarning' \
  && pm2 save"
ssh "$SERVER" "sleep 3 && pm2 logs $NAME --lines 20 --nostream && curl -fsS -o /dev/null -w 'Health check: HTTP %{http_code}\n' http://localhost:3000/"

ssh "$SERVER" "cd $BASE && ls -d app-[0-9][0-9][0-9]* | sort -t- -k2 -n | head -n -3 | xargs -r -t rm -rf --"
