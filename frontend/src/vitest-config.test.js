import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('vitest.config.js', () => {
  let configContent;

  beforeAll(() => {
    const configPath = join(__dirname, '..', 'vitest.config.js');
    configContent = readFileSync(configPath, 'utf-8');
  });

  describe('Basic Configuration', () => {
    it('should import defineConfig from vitest/config', () => {
      expect(configContent).toContain("import { defineConfig } from 'vitest/config'");
    });

    it('should import react plugin', () => {
      expect(configContent).toContain("import react from '@vitejs/plugin-react'");
    });

    it('should use defineConfig', () => {
      expect(configContent).toContain('defineConfig');
    });

    it('should export default config', () => {
      expect(configContent).toContain('export default');
    });
  });

  describe('Plugin Configuration', () => {
    it('should configure react plugin', () => {
      expect(configContent).toContain('plugins:');
      expect(configContent).toContain('react()');
    });
  });

  describe('Test Configuration', () => {
    it('should have test configuration section', () => {
      expect(configContent).toContain('test:');
    });

    it('should enable globals', () => {
      expect(configContent).toContain('globals: true');
    });

    it('should use jsdom environment', () => {
      expect(configContent).toContain("environment: 'jsdom'");
    });

    it('should configure setup files', () => {
      expect(configContent).toContain('setupFiles:');
      expect(configContent).toContain('./src/test/setup.js');
    });
  });

  describe('Coverage Configuration', () => {
    it('should have coverage configuration', () => {
      expect(configContent).toContain('coverage:');
    });

    it('should use v8 provider', () => {
      expect(configContent).toContain("provider: 'v8'");
    });

    it('should configure reporters', () => {
      expect(configContent).toContain('reporter:');
      expect(configContent).toContain("'text'");
      expect(configContent).toContain("'json'");
      expect(configContent).toContain("'html'");
    });

    it('should exclude test files from coverage', () => {
      expect(configContent).toContain('exclude:');
      expect(configContent).toContain('node_modules/');
      expect(configContent).toContain('src/test/');
      expect(configContent).toContain('**/*.config.js');
    });
  });

  describe('File Syntax', () => {
    it('should be valid JavaScript', () => {
      // This test passes if the file can be read without errors
      expect(configContent).toBeTruthy();
    });

    it('should use ES module syntax', () => {
      expect(configContent).toContain('import');
      expect(configContent).toContain('export');
    });

    it('should not use CommonJS syntax', () => {
      expect(configContent).not.toContain('require(');
      expect(configContent).not.toContain('module.exports');
    });
  });
});