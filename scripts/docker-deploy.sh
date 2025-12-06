#!/bin/bash
# FaithFlow Production Deploy Script
# Prevents build cache accumulation

set -e

cd /root/FaithFlow_Enterprise-Grade-Church-Management-System

echo "🧹 Cleaning old Docker resources..."
# Remove dangling images and build cache older than 24h
docker image prune -f --filter "until=24h"
docker builder prune -f --filter "until=24h"

echo "🔨 Building and deploying..."
DOCKER_BUILDKIT=1 docker compose -f docker/compose/prod.yml up -d --build

echo "✅ Deploy complete!"
docker system df
