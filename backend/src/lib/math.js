import { Matrix } from 'ml-matrix';
import { TRADING_DAYS } from '../config/constants.js';

export function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function std(arr, ddof = 0) {
  if (arr.length <= ddof) return 0;
  const m = mean(arr);
  const variance = arr.reduce((acc, x) => acc + (x - m) ** 2, 0) / (arr.length - ddof);
  return Math.sqrt(variance);
}

export function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] * (hi - idx) + sorted[hi] * (idx - lo);
}

export function maxDrawdown(returns) {
  let peak = 1;
  let equity = 1;
  let maxDd = 0;
  for (const r of returns) {
    equity *= 1 + r;
    peak = Math.max(peak, equity);
    maxDd = Math.min(maxDd, (equity - peak) / peak);
  }
  return maxDd;
}

export function sampleCovariance(returnsMatrix) {
  // returnsMatrix: array of series (each series = asset returns aligned)
  const nAssets = returnsMatrix.length;
  const nObs = returnsMatrix[0]?.length || 0;
  if (nObs < 2) throw new Error('Need at least 2 observations');

  const means = returnsMatrix.map((series) => mean(series));
  const cov = Array.from({ length: nAssets }, () => Array(nAssets).fill(0));

  for (let i = 0; i < nAssets; i += 1) {
    for (let j = i; j < nAssets; j += 1) {
      let s = 0;
      for (let t = 0; t < nObs; t += 1) {
        s += (returnsMatrix[i][t] - means[i]) * (returnsMatrix[j][t] - means[j]);
      }
      const v = s / (nObs - 1);
      cov[i][j] = v;
      cov[j][i] = v;
    }
  }
  return cov;
}

/** Simple Ledoit-Wolf style shrinkage toward constant-correlation target. */
export function shrinkCovariance(returnsMatrix) {
  const sample = sampleCovariance(returnsMatrix);
  const n = sample.length;
  const variances = sample.map((row, i) => row[i]);
  const avgVar = mean(variances);

  let corrSum = 0;
  let corrCount = 0;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const denom = Math.sqrt(variances[i] * variances[j]);
      if (denom > 0) {
        corrSum += sample[i][j] / denom;
        corrCount += 1;
      }
    }
  }
  const avgCorr = corrCount ? corrSum / corrCount : 0;

  const target = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      target[i][j] =
        i === j ? variances[i] || avgVar : avgCorr * Math.sqrt(variances[i] * variances[j]);
    }
  }

  const nObs = returnsMatrix[0].length;
  const shrinkage = Math.min(1, Math.max(0, (nAssetsFactor(n) / nObs)));
  const shrunk = sample.map((row, i) =>
    row.map((v, j) => (1 - shrinkage) * v + shrinkage * target[i][j]),
  );

  // Annualize
  return shrunk.map((row) => row.map((v) => v * TRADING_DAYS));
}

function nAssetsFactor(n) {
  return Math.max(1, n);
}

export function matrixVector(mat, vec) {
  return mat.map((row) => row.reduce((acc, v, j) => acc + v * vec[j], 0));
}

export function quadraticForm(w, cov) {
  const cw = matrixVector(cov, w);
  return w.reduce((acc, wi, i) => acc + wi * cw[i], 0);
}

export function projectToSimplex(v) {
  const n = v.length;
  const u = [...v].sort((a, b) => b - a);
  let cssv = 0;
  let rho = -1;
  for (let i = 0; i < n; i += 1) {
    cssv += u[i];
    if (u[i] - (cssv - 1) / (i + 1) > 0) rho = i;
  }
  const theta = (u.slice(0, rho + 1).reduce((a, b) => a + b, 0) - 1) / (rho + 1);
  return v.map((x) => Math.max(x - theta, 0));
}

/**
 * Projected gradient descent on the simplex for min w'Σw - λ w'μ
 * (maximize utility ≈ minimize negative utility)
 */
export function optimizeUtility(mu, cov, riskAversion = 2.5, steps = 800, lr = 0.05) {
  const n = mu.length;
  let w = Array(n).fill(1 / n);

  for (let step = 0; step < steps; step += 1) {
    const covW = matrixVector(cov, w);
    // gradient of (δ/2)w'Σw - w'μ  = δ Σw - μ
    const grad = covW.map((v, i) => riskAversion * v - mu[i]);
    w = projectToSimplex(w.map((wi, i) => wi - lr * grad[i]));
  }
  return normalizeWeights(w);
}

export function optimizeMinVariance(cov, steps = 800, lr = 0.05) {
  const n = cov.length;
  const mu = Array(n).fill(0);
  return optimizeUtility(mu, cov, 1, steps, lr);
}

export function optimizeRiskParity(cov, steps = 1500, lr = 0.08) {
  const n = cov.length;
  let w = Array(n).fill(1 / n);

  for (let step = 0; step < steps; step += 1) {
    const covW = matrixVector(cov, w);
    const portVar = Math.max(w.reduce((a, wi, i) => a + wi * covW[i], 0), 1e-12);
    const rc = w.map((wi, i) => (wi * covW[i]) / portVar);
    const target = 1 / n;
    const grad = rc.map((r, i) => 2 * (r - target) * (covW[i] / portVar));
    w = projectToSimplex(w.map((wi, i) => wi - lr * grad[i]));
  }
  return normalizeWeights(w);
}

export function normalizeWeights(w) {
  const clipped = w.map((x) => Math.max(0, x));
  const sum = clipped.reduce((a, b) => a + b, 0) || 1;
  return clipped.map((x) => x / sum);
}

export function dirichletSample(alpha, rng = Math.random) {
  const gammas = alpha.map((a) => gammaSample(a, rng));
  const sum = gammas.reduce((x, y) => x + y, 0) || 1;
  return gammas.map((g) => g / sum);
}

function gammaSample(shape, rng) {
  // Marsaglia-Tsang for shape >= 1; boost for shape < 1
  if (shape < 1) {
    const u = rng();
    return gammaSample(shape + 1, rng) * u ** (1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x;
    let v;
    do {
      x = normalSample(rng);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

export function normalSample(rng = Math.random) {
  const u1 = rng() || 1e-12;
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function invertMatrix(mat) {
  const m = new Matrix(mat);
  return m.inverse().to2DArray();
}
