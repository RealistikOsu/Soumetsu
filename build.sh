#!/bin/bash

# Build script for RealistikOsu frontend with Tailwind CSS

echo "Installing dependencies..."
npm install

echo "Building Tailwind CSS..."
npx gulp build-tailwind

echo "Building JavaScript..."
npx gulp minify-js

echo "Build complete! Output CSS: static/css/output.css"
