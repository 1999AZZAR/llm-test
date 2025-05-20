#!/bin/bash
# Automated deployment script for Cloudflare Worker and KV sync

# Deploy the Worker
npx wrangler deploy

# Upload the latest systemInstruction.txt to KV
npx wrangler kv key put systemInstruction.txt "$(cat src/systemInstruction.txt)" --namespace-id=67cbe66a63834ddda943524091cc592e --remote

echo "Deployment complete. systemInstruction.txt synced to KV." 