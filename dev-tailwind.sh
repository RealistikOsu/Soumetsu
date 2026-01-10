#!/bin/bash
# Quick script to run Tailwind CSS in watch mode for development

cd "$(dirname "$0")"

echo "🎨 Starting Tailwind CSS in watch mode..."
echo "📁 Watching: templates/**/*.html, static/css/input.css, tailwind.config.js"
echo "📦 Output: static/css/output.css"
echo ""
echo "Press Ctrl+C to stop"
echo ""

npx tailwindcss -i ./static/css/input.css -o ./static/css/output.css --watch
