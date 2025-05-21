#!/bin/bash
# Automated deployment script for Cloudflare Worker and KV sync

# Ensure RATE_LIMITER_KV namespace is created in Cloudflare dashboard
# and its ID is correctly set in wrangler.toml

# Deploy the Worker
npx wrangler deploy

# Upload the latest systemInstruction.txt to KV
npx wrangler kv key put systemInstruction.txt "$(cat src/systemInstruction.txt)" --namespace-id=c5b17d99100540cab8837900b61d9c76 --remote

echo "Deployment complete. systemInstruction.txt synced to KV." 