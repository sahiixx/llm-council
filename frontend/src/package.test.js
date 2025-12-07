import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('package.json', () => {
  let packageData;

  beforeAll(() => {
    const packagePath = join(__dirname, '..', 'package.json');
    const packageContent = readFileSync(packagePath, 'utf-8');
    packageData = JSON.parse(packageContent);
  });

  describe('Basic Metadata', () => {
    it('should have a name field', () => {
      expect(packageData.name).toBeDefined();
      expect(typeof packageData.name).toBe('string');
      expect(packageData.name.length).toBeGreaterThan(0);
    });

    it('should have a version field', () => {
      expect(packageData.version).toBeDefined();
      expect(typeof packageData.version).toBe('string');
    });

    it('should have a private field', () => {
      expect(packageData.private).toBeDefined();
      expect(typeof packageData.private).toBe('boolean');
    });

    it('should have a type field set to module', () => {
      expect(packageData.type).toBeDefined();
      expect(packageData.type).toBe('module');
    });
  });

  describe('Scripts', () => {
    it('should have scripts defined', () => {
      expect(packageData.scripts).toBeDefined();
      expect(typeof packageData.scripts).toBe('object');
    });

    it('should have dev script', () => {
      expect(packageData.scripts.dev).toBeDefined();
      expect(packageData.scripts.dev).toContain('vite');
    });

    it('should have build script', () => {
      expect(packageData.scripts.build).toBeDefined();
      expect(packageData.scripts.build).toContain('vite build');
    });

    it('should have lint script', () => {
      expect(packageData.scripts.lint).toBeDefined();
      expect(packageData.scripts.lint).toContain('eslint');
    });

    it('should have preview script', () => {
      expect(packageData.scripts.preview).toBeDefined();
      expect(packageData.scripts.preview).toContain('vite preview');
    });

    it('should have test script', () => {
      expect(packageData.scripts.test).toBeDefined();
      expect(packageData.scripts.test).toContain('vitest');
    });

    it('should have test:ui script', () => {
      expect(packageData.scripts['test:ui']).toBeDefined();
      expect(packageData.scripts['test:ui']).toContain('vitest');
      expect(packageData.scripts['test:ui']).toContain('--ui');
    });

    it('should have test:coverage script', () => {
      expect(packageData.scripts['test:coverage']).toBeDefined();
      expect(packageData.scripts['test:coverage']).toContain('vitest');
      expect(packageData.scripts['test:coverage']).toContain('--coverage');
    });
  });

  describe('Dependencies', () => {
    it('should have dependencies object', () => {
      expect(packageData.dependencies).toBeDefined();
      expect(typeof packageData.dependencies).toBe('object');
    });

    it('should include React', () => {
      expect(packageData.dependencies.react).toBeDefined();
      expect(packageData.dependencies.react).toMatch(/^\^?\d+\./);
    });

    it('should include React DOM', () => {
      expect(packageData.dependencies['react-dom']).toBeDefined();
      expect(packageData.dependencies['react-dom']).toMatch(/^\^?\d+\./);
    });

    it('should have React and React DOM versions in sync', () => {
      const reactVersion = packageData.dependencies.react;
      const reactDomVersion = packageData.dependencies['react-dom'];
      expect(reactVersion).toBe(reactDomVersion);
    });

    it('should not have test libraries in dependencies', () => {
      expect(packageData.dependencies['@testing-library/react']).toBeUndefined();
      expect(packageData.dependencies.vitest).toBeUndefined();
    });
  });

  describe('Dev Dependencies', () => {
    it('should have devDependencies object', () => {
      expect(packageData.devDependencies).toBeDefined();
      expect(typeof packageData.devDependencies).toBe('object');
    });

    it('should include Vite', () => {
      expect(packageData.devDependencies.vite).toBeDefined();
    });

    it('should include Vitest', () => {
      expect(packageData.devDependencies.vitest).toBeDefined();
    });

    it('should include @vitest/ui', () => {
      expect(packageData.devDependencies['@vitest/ui']).toBeDefined();
    });

    it('should include @vitest/coverage-v8', () => {
      expect(packageData.devDependencies['@vitest/coverage-v8']).toBeDefined();
    });

    it('should include @testing-library/react', () => {
      expect(packageData.devDependencies['@testing-library/react']).toBeDefined();
    });

    it('should include @testing-library/jest-dom', () => {
      expect(packageData.devDependencies['@testing-library/jest-dom']).toBeDefined();
    });

    it('should include @testing-library/user-event', () => {
      expect(packageData.devDependencies['@testing-library/user-event']).toBeDefined();
    });

    it('should include jsdom', () => {
      expect(packageData.devDependencies.jsdom).toBeDefined();
    });

    it('should include ESLint', () => {
      expect(packageData.devDependencies.eslint).toBeDefined();
    });

    it('should include ESLint React plugin', () => {
      expect(packageData.devDependencies['eslint-plugin-react']).toBeDefined();
    });

    it('should include ESLint React Hooks plugin', () => {
      expect(packageData.devDependencies['eslint-plugin-react-hooks']).toBeDefined();
    });

    it('should include ESLint React Refresh plugin', () => {
      expect(packageData.devDependencies['eslint-plugin-react-refresh']).toBeDefined();
    });

    it('should include @vitejs/plugin-react', () => {
      expect(packageData.devDependencies['@vitejs/plugin-react']).toBeDefined();
    });

    it('should include globals', () => {
      expect(packageData.devDependencies.globals).toBeDefined();
    });
  });

  describe('Version Constraints', () => {
    it('should use caret or exact versions for dependencies', () => {
      Object.values(packageData.dependencies || {}).forEach((version) => {
        expect(version).toMatch(/^(\^|~)?\d+\./);
      });
    });

    it('should use caret or exact versions for devDependencies', () => {
      Object.values(packageData.devDependencies || {}).forEach((version) => {
        expect(version).toMatch(/^(\^|~)?\d+\./);
      });
    });
  });

  describe('Testing Configuration Completeness', () => {
    it('should have all testing library packages', () => {
      const testingLibraries = [
        '@testing-library/react',
        '@testing-library/jest-dom',
        '@testing-library/user-event',
      ];

      testingLibraries.forEach((lib) => {
        expect(packageData.devDependencies[lib]).toBeDefined();
      });
    });

    it('should have vitest and related packages', () => {
      const vitestPackages = ['vitest', '@vitest/ui', '@vitest/coverage-v8'];

      vitestPackages.forEach((pkg) => {
        expect(packageData.devDependencies[pkg]).toBeDefined();
      });
    });

    it('should have jsdom for DOM testing', () => {
      expect(packageData.devDependencies.jsdom).toBeDefined();
    });
  });

  describe('Build Tool Configuration', () => {
    it('should use Vite as build tool', () => {
      expect(packageData.devDependencies.vite).toBeDefined();
      expect(packageData.scripts.build).toContain('vite');
    });

    it('should have Vite React plugin', () => {
      expect(packageData.devDependencies['@vitejs/plugin-react']).toBeDefined();
    });
  });

  describe('Package Consistency', () => {
    it('should not have duplicate packages across dependencies and devDependencies', () => {
      const deps = Object.keys(packageData.dependencies || {});
      const devDeps = Object.keys(packageData.devDependencies || {});
      const intersection = deps.filter((dep) => devDeps.includes(dep));
      expect(intersection).toEqual([]);
    });

    it('should have reasonable number of dependencies', () => {
      const totalDeps =
        Object.keys(packageData.dependencies || {}).length +
        Object.keys(packageData.devDependencies || {}).length;
      expect(totalDeps).toBeGreaterThan(0);
      expect(totalDeps).toBeLessThan(100); // Sanity check
    });
  });

  describe('Modern JavaScript Features', () => {
    it('should specify ES module type', () => {
      expect(packageData.type).toBe('module');
    });

    it('should not have legacy CommonJS indicators', () => {
      expect(packageData.main).toBeUndefined();
      expect(packageData.module).toBeUndefined();
    });
  });
});