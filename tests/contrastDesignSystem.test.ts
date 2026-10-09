import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/index.css', 'utf8');

function token(name: string): string {
  const value = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
  if (!value) throw new Error(`Missing hex color token ${name}`);
  return value;
}

function luminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => parseInt(channel, 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(foreground: string, background: string): number {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe('light theme contrast contracts', () => {
  it('meets text and control-boundary contrast targets for shared theme tokens', () => {
    const white = '#ffffff';
    const appBackground = token('--color-background');
    const primary = token('--color-primary');
    const primaryHover = token('--color-primary-hover');
    const muted = token('--color-text-muted');
    const border = token('--color-border');
    const disabledSurface = token('--color-disabled-surface');
    const disabledText = token('--color-disabled-text');

    expect(contrastRatio(white, primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(white, primaryHover)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(muted, appBackground)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(border, white)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(border, appBackground)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(disabledText, disabledSurface)).toBeGreaterThanOrEqual(4.5);

    for (const name of [
      '--action-blue',
      '--action-blue-hover',
      '--action-indigo',
      '--action-indigo-hover',
      '--action-purple',
      '--action-purple-hover',
      '--action-amber',
      '--action-amber-hover',
      '--action-rose',
      '--action-rose-hover',
      '--action-teal',
      '--action-teal-hover',
      '--action-sky',
      '--action-sky-hover',
    ]) {
      expect(contrastRatio(white, token(name))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('normalizes legacy green action buttons across their interactive states', () => {
    expect(css).toContain("[class~='bg-emerald-600']");
    expect(css).toContain("[class~='bg-green-600']");
    expect(css).toContain("[class~='bg-blue-500']");
    expect(css).toContain("[class~='bg-amber-500']");
    expect(css).toContain(")[class~='text-white']");
    expect(css).toContain('--button-action: var(--action-primary);');
    expect(css).toContain(":hover:not(:disabled):not([aria-busy='true'])");
    expect(css).toContain(":active:not(:disabled):not([aria-busy='true'])");
    expect(css).toContain(":is(:disabled, [aria-disabled='true'], [aria-busy='true'])");
    expect(css).toContain('opacity: 1 !important;');
    for (const active of [
      '#064e3b',
      '#1e3a8a',
      '#312e81',
      '#581c87',
      '#78350f',
      '#881337',
      '#134e4a',
      '#0c4a6e',
    ]) {
      expect(contrastRatio('#ffffff', active)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps the Inspector assignment acceptance action on the shared accessible contract', () => {
    const component = readFileSync(
      'src/components/dashboard/inspector/InspectorPendingAssignments.tsx',
      'utf8'
    );
    const acceptButton = component.slice(
      component.indexOf('onClick={() => handleAccept(a.teacherId)}'),
      component.indexOf('</button>', component.indexOf('onClick={() => handleAccept(a.teacherId)}'))
    );

    expect(acceptButton).toContain('action-primary');
    expect(acceptButton).toContain('disabled={isProcessing}');
    expect(acceptButton).toContain('aria-busy={isProcessing}');
  });
});
