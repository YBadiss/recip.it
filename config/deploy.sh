#!/bin/bash
# Uploads nginx-config to the droplet, tests it (rolling back on failure) and reloads nginx.
set -euo pipefail

SERVER="${DEPLOY_USER:-root}@${DEPLOY_HOST:-167.71.143.97}"
REMOTE=/etc/nginx/sites-available/recipit
backup="nginx-config-$(date +%s).bak"

scp "$SERVER:$REMOTE" "$backup"
scp nginx-config "$SERVER:$REMOTE"

if ! ssh "$SERVER" "sudo -n nginx -t"; then
    echo "nginx config test failed, rolling back to the previous config." >&2
    scp "$backup" "$SERVER:$REMOTE"
    exit 1
fi

ssh "$SERVER" "sudo -n systemctl reload nginx"
