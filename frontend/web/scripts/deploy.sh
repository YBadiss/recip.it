#!/bin/bash
set -e

# Build the project
VITE_API_URL=https://api.recipit.me npm run build

timestamp=$(date +%s)

# Deploy the project
scp -r dist/* root@167.71.143.97:/var/www/recip.it/frontend-${timestamp}
scp package*.json root@167.71.143.97:/var/www/recip.it/frontend-${timestamp}/

# Install dependencies
ssh root@167.71.143.97 "cd /var/www/recip.it/frontend-${timestamp} && npm i --omit=dev"

# Create a new symlink
ssh root@167.71.143.97 "rm /var/www/recip.it/frontend && ln -s /var/www/recip.it/frontend-${timestamp} /var/www/recip.it/frontend"
