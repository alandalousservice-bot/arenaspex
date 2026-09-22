import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const renderYaml = readFileSync(resolve(root, 'render.yaml'), 'utf8');

describe('production deployment contract', () => {
  it('migrates and builds without automatically running application or geo seeds', () => {
    const build = packageJson.scripts['render:build'];

    expect(build).toContain('prisma migrate deploy');
    expect(build).toContain('npm run build');
    expect(build).not.toContain('db:seed');
    expect(build).not.toContain('db:seed:geo');
    expect(packageJson.scripts['db:seed']).toBeTruthy();
    expect(packageJson.scripts['db:seed:geo']).toBeTruthy();
  });

  it('declares the centralized Gemini pedagogical generation contract', () => {
    expect(renderYaml).toContain('key: PEDAGOGICAL_GENERATION_PROVIDER');
    expect(renderYaml).toContain('value: gemini');
    expect(renderYaml).toContain('key: GEMINI_PEDAGOGICAL_MODEL');
    expect(renderYaml).toContain('value: gemini-3.6-flash');
    expect(renderYaml).toContain('key: GEMINI_API_KEY');
    expect(renderYaml).not.toContain('key: GEMINI_MODEL');
  });
});
