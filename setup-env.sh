#!/bin/bash
# Setup script for Soumetsu environment configuration

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -f .env ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted. Keeping existing .env file."
        exit 0
    fi
fi

if [ ! -f env.example ]; then
    echo "❌ env.example file not found!"
    exit 1
fi

cp env.example .env
echo "✅ Created .env file from env.example"
echo ""
echo "📝 Please edit .env file and update the following values:"
echo "   - SOUMETSU_COOKIE_SECRET (generate a secure random string)"
echo "   - SOUMETSU_KEY (get from your API service)"
echo "   - Database credentials (DB_HOST, DB_USER, DB_PASS)"
echo "   - Redis credentials (REDIS_HOST, REDIS_PASS if needed)"
echo "   - Mailgun credentials (if using email)"
echo "   - reCAPTCHA keys (if using reCAPTCHA)"
echo "   - Discord OAuth credentials (if using Discord login)"
echo ""
echo "You can generate a secure cookie secret with:"
echo "   openssl rand -base64 32"
