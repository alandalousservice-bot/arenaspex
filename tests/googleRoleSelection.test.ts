import { afterEach, describe, expect, it, vi } from 'vitest';

// Exercise the GIS callback lifecycle without fetching Google's script or using a DOM.
const hooks = vi.hoisted(() => ({
  refs: [] as { current: unknown }[],
  cursor: 0,
  effects: [] as (() => unknown)[],
}));
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useRef: (initial: unknown) => {
      const index = hooks.cursor++;
      hooks.refs[index] ||= { current: initial === null ? { innerHTML: '' } : initial };
      return hooks.refs[index];
    },
    useState: (initial: unknown) => [initial, vi.fn()],
    useEffect: (effect: () => unknown) => {
      if (hooks.effects.length === 0) hooks.effects.push(effect);
    },
  };
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Google selected role callback', () => {
  it('uses the latest role after selection changes without reinitializing GIS', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'local-mocked-client');
    const { GoogleSignInButton } = await import('../src/components/auth/GoogleSignInButton');
    let credentialCallback: (response: { credential: string }) => void;
    const initialize = vi.fn((config) => {
      credentialCallback = config.callback;
    });
    vi.stubGlobal('window', {
      google: { accounts: { id: { initialize, renderButton: vi.fn(), cancel: vi.fn() } } },
    });
    const submittedRoles: string[] = [];
    hooks.refs = [];
    hooks.cursor = 0;
    hooks.effects = [];
    GoogleSignInButton({
      onCredential: () => {
        submittedRoles.push('teacher');
      },
      text: 'signup_with',
    });
    hooks.effects[0]();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(initialize).toHaveBeenCalledTimes(1);
    hooks.cursor = 0;
    GoogleSignInButton({
      onCredential: () => {
        submittedRoles.push('inspector');
      },
      text: 'signup_with',
    });
    credentialCallback!({ credential: 'verified-mocked-credential' });
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(submittedRoles).toEqual(['inspector']);
    hooks.cursor = 0;
    GoogleSignInButton({
      onCredential: () => {
        submittedRoles.push('teacher');
      },
      text: 'signup_with',
    });
    credentialCallback!({ credential: 'verified-mocked-credential' });
    expect(submittedRoles).toEqual(['inspector', 'teacher']);
  });
});
