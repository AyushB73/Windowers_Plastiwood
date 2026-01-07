#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting build process...');

try {
  // Install frontend dependencies
  console.log('📦 Installing frontend dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  // Build frontend
  console.log('🏗️ Building frontend...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Check if dist folder was created
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    console.log('✅ Frontend build successful');
    const files = fs.readdirSync(distPath);
    console.log('📄 Built files:', files);
  } else {
    throw new Error('❌ Frontend build failed - dist folder not found');
  }
  
  // Install server dependencies
  console.log('📦 Installing server dependencies...');
  execSync('cd server && npm install', { stdio: 'inherit' });
  
  console.log('🎉 Build process completed successfully!');
  
} catch (error) {
  console.error('❌ Build process failed:', error.message);
  process.exit(1);
}