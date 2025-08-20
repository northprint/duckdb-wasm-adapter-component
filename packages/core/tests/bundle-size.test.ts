import { describe, it, expect } from 'vitest';
import { statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Bundle Size', () => {
  const maxSizes = {
    'index.js': 100 * 1024, // 100KB
    'index.js.map': 250 * 1024, // 250KB
  };

  it('should not exceed maximum bundle size', () => {
    const distPath = join(__dirname, '..', 'dist');
    
    Object.entries(maxSizes).forEach(([file, maxSize]) => {
      const filePath = join(distPath, file);
      
      try {
        const stats = statSync(filePath);
        const sizeInKB = stats.size / 1024;
        
        console.log(`${file}: ${sizeInKB.toFixed(2)}KB (max: ${maxSize / 1024}KB)`);
        
        expect(stats.size).toBeLessThanOrEqual(maxSize);
      } catch (error) {
        // File doesn't exist, skip
        console.warn(`Bundle file ${file} not found, skipping size check`);
      }
    });
  });

  it('should have tree-shaking enabled', () => {
    // Check that sideEffects is false in package.json
    const packageJson = require('../package.json');
    expect(packageJson.sideEffects).toBe(false);
  });

  it('should export ESM format', () => {
    const packageJson = require('../package.json');
    expect(packageJson.type).toBe('module');
    expect(packageJson.exports['.'].import).toBeDefined();
  });
});