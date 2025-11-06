#!/bin/bash

SSH_OPTIONS="$@"
echo "$SSH_OPTIONS"

timestamp=$(date +%s)

# Deploy to root of badyass.xyz (home directory)
scp $SSH_OPTIONS root@167.71.143.97:/etc/nginx/sites-available/recipit nginx-config-${timestamp}
scp $SSH_OPTIONS nginx-config root@167.71.143.97:/etc/nginx/sites-available/recipit

# Test nginx config. Make sure to reset the default config file after testing if we failed.
ssh $SSH_OPTIONS root@167.71.143.97 "nginx -t"

if [ $? -ne 0 ]; then
    echo "Nginx config test failed. Rolling back to previous config."
    scp $SSH_OPTIONS nginx-config-${timestamp} root@167.71.143.97:/etc/nginx/sites-available/recipit
    exit 1
fi

# Reload nginx
ssh $SSH_OPTIONS root@167.71.143.97 "nginx -s reload"
