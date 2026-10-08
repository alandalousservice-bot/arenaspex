import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

// Exercise the actual libraries used by Express, without a server or database.
const expressRequire = createRequire(createRequire(import.meta.url).resolve('express'));
const proxyAddr = expressRequire('proxy-addr');
const qs = expressRequire('qs');

describe('dependency security regressions', () => {
  it('does not trust an external IPv4 address through a short mapped IPv6 subnet', () => {
    // GHSA-jqcg-44mw-7w3h: the old compiler trusted every IPv4 address here.
    expect(proxyAddr.compile('::ffff:10.0.0.0/8')('203.0.113.7')).toBe(false);
    const trust = proxyAddr.compile('::ffff:10.0.0.0/104');
    expect(trust('10.1.2.3')).toBe(true);
    expect(trust('203.0.113.7')).toBe(false);
  });

  it('safely serializes query data containing a non-callable constructor.isBuffer', () => {
    // GHSA-4mjr-xmp4-gh2g: no prototype pollution is needed for this round-trip.
    const parsed = qs.parse('constructor[isBuffer]=boom', { plainObjects: true });
    expect(() => qs.stringify(parsed)).not.toThrow();
    expect(qs.stringify(parsed)).toBe('constructor%5BisBuffer%5D=boom');
  });

  it('enforces comma array limits for bracket keys as well as plain keys', () => {
    // GHSA-x5fp-wj9c-mxmx: both forms must respect the configured array limit.
    for (const query of ['a=1,2,3,4', 'a[]=1,2,3,4']) {
      expect(() =>
        qs.parse(query, { comma: true, arrayLimit: 3, throwOnLimitExceeded: true })
      ).toThrow(RangeError);
    }
  });
});
