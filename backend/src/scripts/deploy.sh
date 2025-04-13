#!/bin/bash

ssh-add ~/.ssh/DigitalOcean

# Build the project
npm run build

timestamp=$(date +%s)

# Deploy the project
scp -i ~/.ssh/DigitalOcean -r dist/* root@167.71.143.97:/var/www/recip.it/backend-${timestamp}
scp -i ~/.ssh/DigitalOcean package*.json root@167.71.143.97:/var/www/recip.it/backend-${timestamp}/
ssh -i ~/.ssh/DigitalOcean root@167.71.143.97 "ln -s /root/recip.it/backend/.env /var/www/recip.it/backend-${timestamp}/.env"

# Install dependencies
ssh -i ~/.ssh/DigitalOcean root@167.71.143.97 "cd /var/www/recip.it/backend-${timestamp} && npm i --omit=dev"

# Create a new symlink
ssh -i ~/.ssh/DigitalOcean root@167.71.143.97 "rm /var/www/recip.it/backend && ln -s /var/www/recip.it/backend-${timestamp} /var/www/recip.it/backend"
ssh -i ~/.ssh/DigitalOcean root@167.71.143.97 "pm2 restart recipi-backend && sleep 1 && pm2 logs recipi-backend"
