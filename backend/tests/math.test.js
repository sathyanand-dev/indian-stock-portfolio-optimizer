import { describe, it, expect } from 'vitest';
import {
  optimizeMinVariance,
  optimizeRiskParity,
  optimizeUtility,
  projectToSimplex,
  shrinkCovariance,
} from '../src/lib/math.js';

describe('math / optimization helpers', () => {
  it('should project onto simplex', () => {
    const w = projectToSimplex([0.7, 0.7, -0.1]);
    const sum = w.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(w.every((x) => x >= -1e-9)).toBe(true);
  });

  it('should produce valid mean-variance weights', () => {
    const returns = [
      [0.01, -0.02, 0.015, 0.0, 0.01, -0.005, 0.02, 0.01, -0.01, 0.005],
      [0.005, -0.01, 0.01, 0.002, 0.008, -0.002, 0.012, 0.004, -0.006, 0.003],
      [0.02, -0.03, 0.025, -0.01, 0.015, -0.008, 0.03, 0.01, -0.02, 0.01],
    ];
    // expand synthetic series
    const series = returns.map((base) => {
      const out = [];
      for (let i = 0; i < 40; i += 1) out.push(base[i % base.length] + (i % 7) * 0.0001);
      return out;
    });
    const cov = shrinkCovariance(series);
    const mu = [0.12, 0.1, 0.18];
    const w = optimizeUtility(mu, cov, 2.5);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
    expect(w.every((x) => x >= 0)).toBe(true);

    const gmv = optimizeMinVariance(cov);
    expect(gmv.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);

    const rp = optimizeRiskParity(cov);
    expect(rp.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
  });
});
