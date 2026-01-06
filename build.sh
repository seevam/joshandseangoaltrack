#!/bin/bash
set -e

echo "Current directory: $(pwd)"
echo "Listing files:"
ls -la

echo "Navigating to app directory..."
cd app

echo "Installing dependencies..."
npm install

echo "Building app..."
npm run build

echo "Build complete!"
