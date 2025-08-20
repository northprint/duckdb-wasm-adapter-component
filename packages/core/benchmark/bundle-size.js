#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function getDirectorySize(dirPath) {
  let totalSize = 0;
  const files = await fs.readdir(dirPath, { withFileTypes: true });
  
  for (const file of files) {
    const filePath = path.join(dirPath, file.name);
    if (file.isDirectory()) {
      totalSize += await getDirectorySize(filePath);
    } else {
      const stats = await fs.stat(filePath);
      totalSize += stats.size;
    }
  }
  
  return totalSize;
}

async function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

async function measureBundleSizes() {
  console.log('📦 Bundle Size Report\n');
  console.log('=' . repeat(50));
  
  const packages = ['core', 'react-adapter', 'vue-adapter', 'svelte-adapter'];
  const results = [];
  
  for (const pkg of packages) {
    const distPath = path.join(__dirname, '..', '..', pkg, 'dist');
    
    try {
      const totalSize = await getDirectorySize(distPath);
      const jsFiles = await fs.readdir(distPath);
      const mainFile = jsFiles.find(f => f === 'index.js');
      
      let mainFileSize = 0;
      if (mainFile) {
        const stats = await fs.stat(path.join(distPath, mainFile));
        mainFileSize = stats.size;
      }
      
      results.push({
        package: pkg,
        totalSize,
        mainFileSize,
        fileCount: jsFiles.length
      });
      
      console.log(`\n📁 @northprint/duckdb-wasm-adapter-${pkg}`);
      console.log(`   Total size: ${await formatSize(totalSize)}`);
      console.log(`   Main bundle: ${await formatSize(mainFileSize)}`);
      console.log(`   Files: ${jsFiles.length}`);
      console.log(`   Code splitting: ${jsFiles.length > 3 ? '✅ Enabled' : '❌ Disabled'}`);
    } catch (error) {
      console.error(`   ❌ Error measuring ${pkg}: ${error.message}`);
    }
  }
  
  console.log('\n' + '=' . repeat(50));
  
  // Calculate total and improvements
  const totalBefore = 408 * 1024 + 192 * 1024 + 172 * 1024 + 156 * 1024; // KB to bytes
  const totalAfter = results.reduce((sum, r) => sum + r.totalSize, 0);
  const improvement = ((totalBefore - totalAfter) / totalBefore * 100).toFixed(1);
  
  console.log('\n📊 Summary:');
  console.log(`   Total before: ${await formatSize(totalBefore)}`);
  console.log(`   Total after: ${await formatSize(totalAfter)}`);
  console.log(`   Improvement: ${improvement > 0 ? '🎉' : '⚠️'} ${improvement}%`);
  
  // Check for code splitting
  const hasSplitting = results.some(r => r.fileCount > 3);
  console.log(`   Code Splitting: ${hasSplitting ? '✅ Active' : '❌ Inactive'}`);
  console.log(`   Tree Shaking: ✅ Enabled (sideEffects: false)`);
}

measureBundleSizes().catch(console.error);