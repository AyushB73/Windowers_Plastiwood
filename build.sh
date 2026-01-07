#!/bin/bash
set -e

echo "🔧 Installing frontend dependencies..."
npm install

echo "🏗️ Building frontend..."
npm run build

echo "🔧 Installing server dependencies..."
cd server
npm install

echo "🗄️ Running database migration..."
npm run migrate

echo "✅ Build completed successfully!"