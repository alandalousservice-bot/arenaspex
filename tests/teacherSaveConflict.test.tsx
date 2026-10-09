import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../src/types/spex';
import { syncUserToDB } from '../src/services/api';
const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }));
vi.mock('react', async (load) => {
  const actual = await load<typeof import('react')>();
  return {
    ...actual,
    useEffect: () => {},
    useState: (initial: unknown) => {
      const i = hooks.cursor++;
      if (!(i in hooks.values))
        hooks.values[i] = typeof initial === 'function' ? (initial as () => unknown)() : initial;
      return [
        hooks.values[i],
        (value: unknown) => {
          hooks.values[i] =
            typeof value === 'function'
              ? (value as (old: unknown) => unknown)(hooks.values[i])
              : value;
        },
      ];
    },
  };
});
import { SettingsView } from '../src/components/settings/SettingsView';
const user = {
  id: 'synthetic',
  firstName: 'Initial',
  lastName: 'Teacher',
  email: 'teacher@example.test',
  role: 'teacher',
  directorateId: '',
  districtId: '',
} as User;
function elements(node: unknown): React.ReactElement<Record<string, any>>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!React.isValidElement<Record<string, any>>(node)) return [];
  return [node, ...elements(node.props.children)];
}
describe('teacher save conflict feedback', () => {
  beforeEach(() => vi.stubGlobal('navigator', { onLine: true }));
  afterEach(() => {
    vi.unstubAllGlobals();
    hooks.values = [];
    hooks.cursor = 0;
  });
  it('uses one write and returns its saved server user', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ user }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    expect(await syncUserToDB(user)).toMatchObject({ success: true, user });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('never reports a 409 or forbidden save as successful', async () => {
    for (const status of [409, 403]) {
      const fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              error: 'temporary conflict',
              code: 'TRANSACTION_CONFLICT',
              retryable: true,
            }),
            { status }
          )
        );
      vi.stubGlobal('fetch', fetch);
      expect(await syncUserToDB(user)).toMatchObject({
        success: false,
        error: 'temporary conflict',
      });
      expect(fetch).toHaveBeenCalledTimes(1);
    }
  });
  it('requires a saved user before confirming success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
    expect((await syncUserToDB(user)).success).toBe(false);
  });
  it('retains edited input after failure and confirms only a successful retry', async () => {
    const save = vi
      .fn()
      .mockResolvedValueOnce({ success: false, error: 'تعارض مؤقت' })
      .mockResolvedValueOnce({ success: true });
    const render = () => {
      hooks.cursor = 0;
      return elements(
        SettingsView({ currentUser: user, onUpdateUser: save, onUserSaved: vi.fn() })!
      );
    };
    let tree = render();
    const input = tree.find((e) => e.type === 'input' && e.props.value === 'Initial')!;
    input.props.onChange({ target: { value: 'Unsaved teacher' } });
    tree = render();
    await tree.find((e) => e.type === 'form')!.props.onSubmit({ preventDefault() {} });
    tree = render();
    expect(tree.some((e) => e.props.role === 'alert')).toBe(true);
    expect(
      tree.find((e) => e.type === 'input' && e.props.value === 'Unsaved teacher')
    ).toBeDefined();
    expect(tree.some((e) => String(e.props.children).includes('تم حفظ التغييرات والبريد'))).toBe(
      false
    );
    await tree.find((e) => e.type === 'form')!.props.onSubmit({ preventDefault() {} });
    tree = render();
    expect(save.mock.calls[1][0].firstName).toBe('Unsaved teacher');
    expect(tree.some((e) => e.props.role === 'alert')).toBe(false);
    expect(tree.some((e) => String(e.props.children).includes('تم حفظ التغييرات والبريد'))).toBe(
      true
    );
  });
});
