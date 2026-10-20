import { env } from '../config/env.js';
import { getCache, setCache } from '../lib/cache.js';
import { badRequest, notFound } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

const NSE_BASE = 'https://www.nseindia.com';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

let nseCookie = '';
let nseCookieAt = 0;

function num(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const cleaned = String(value).replace(/,/g, '').replace(/Rs\.?/gi, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parsePriceBand(text) {
  if (!text) return { low: null, high: null, label: null };
  const label = String(text).replace(/Rs\.?/gi, '').trim();
  const parts = label.split(/\s*(?:to|-|–)\s*/i).map((p) => num(p)).filter((n) => n != null);
  if (parts.length >= 2) return { low: parts[0], high: parts[1], label };
  if (parts.length === 1) return { low: parts[0], high: parts[0], label };
  return { low: null, high: null, label };
}

function parseIssueInfoList(dataList = []) {
  const map = {};
  for (const row of dataList) {
    if (!row?.title) continue;
    map[String(row.title).trim()] = row.value;
  }
  return map;
}

function scoreBand(score) {
  if (score >= 75) return 'Strong';
  if (score >= 60) return 'Constructive';
  if (score >= 45) return 'Mixed';
  if (score >= 30) return 'Cautious';
  return 'Weak';
}

function clamp(n, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

async function refreshNseSession() {
  const res = await fetch(`${NSE_BASE}/`, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
  });
  const set = res.headers.getSetCookie?.() || [];
  nseCookie = set.map((c) => c.split(';')[0]).join('; ');
  nseCookieAt = Date.now();
}

async function nseGet(path) {
  if (!nseCookie || Date.now() - nseCookieAt > 10 * 60 * 1000) {
    await refreshNseSession();
  }
  const res = await fetch(`${NSE_BASE}${path}`, {
    headers: {
      'User-Agent': UA,
      Accept: 'application/json,text/plain,*/*',
      Referer: `${NSE_BASE}/market-data/all-upcoming-issues-ipo`,
      Cookie: nseCookie,
    },
  });
  const set = res.headers.getSetCookie?.() || [];
  if (set.length) {
    const extras = set.map((c) => c.split(';')[0]);
    nseCookie = [...new Set([...nseCookie.split('; ').filter(Boolean), ...extras])].join('; ');
    nseCookieAt = Date.now();
  }
  if (!res.ok) {
    throw new Error(`NSE ${path} returned ${res.status}`);
  }
  return res.json();
}

function extractSubscription(detail) {
  const rows = detail?.activeCat?.dataList || detail?.bidDetails || [];
  const categories = [];
  let qib = null;
  let nii = null;
  let retail = null;
  let total = null;

  for (const row of rows) {
    const name = row.category || row.name || '';
    if (!name || name === 'Category') continue;
    const offered = num(row.noOfShareOffered ?? row.noOfSharesOffered);
    const bid = num(row.noOfSharesBid ?? row.noOfsharesBid);
    const times = num(row.noOfTotalMeant ?? row.noOfTime);
    categories.push({ name, offered, bid, times });

    const lower = name.toLowerCase();
    if (lower.includes('qualified institutional') && !lower.includes('foreign')) qib = times;
    if (lower.startsWith('non institutional investors') && !lower.includes('bid amount')) nii = times;
    if (lower.includes('retail individual')) retail = times;
    if (lower === 'total') total = times;
  }

  return {
    qib,
    nii,
    retail,
    total,
    updated_at: detail?.activeCat?.updateTime || null,
    categories,
  };
}

function normalizeFromCurrent(row) {
  const band = parsePriceBand(row.issuePrice);
  return {
    symbol: String(row.symbol || '').toUpperCase(),
    company_name: row.companyName,
    status: String(row.status || 'Active').toLowerCase() === 'active' ? 'open' : String(row.status || '').toLowerCase(),
    series: row.series || null,
    issue_start_date: row.issueStartDate || null,
    issue_end_date: row.issueEndDate || null,
    price_band: band.label,
    issue_price_low: band.low,
    issue_price_high: band.high,
    issue_price: band.high,
    issue_size_shares: num(row.issueSize || row.noOfSharesOffered),
    subscription_total_quick: num(row.noOfTime),
    shares_bid: num(row.noOfsharesBid),
    source: 'nse',
  };
}

function enrichFromDetail(base, detail) {
  const info = parseIssueInfoList(detail?.issueInfo?.dataList || []);
  const lot = num(info['Lot Size'] || info['Market Lot'] || info.lotSize);
  const face = num(info['Face Value'] || info.faceValue);
  const issuePrice = num(info['Issue Price']) || base.issue_price;
  const minInvestment = lot && issuePrice ? lot * issuePrice : null;
  const subscription = extractSubscription(detail);

  return {
    ...base,
    company_name: info['Company Name'] || base.company_name || info.Symbol || base.symbol,
    lot_size: lot,
    face_value: face,
    issue_price: issuePrice || base.issue_price,
    listing_on: info['Exchange'] || info['Listing At'] || 'NSE',
    registrar: info['Registrar'] || info['Registrar to the Issue'] || null,
    issue_period: info['Issue Period'] || null,
    lead_managers: info['Lead Manager'] || info['Book Running Lead Managers'] || null,
    subscription,
    raw_issue_info: info,
  };
}

async function fetchIpoGuruMap() {
  const key = env.IPO_GURU_API_KEY;
  if (!key) return { enabled: false, byName: new Map(), message: 'IPO_GURU_API_KEY not set' };

  try {
    const res = await fetch('https://www.ipoguru.in/api/v1/ipos', {
      headers: { 'X-API-KEY': key, Accept: 'application/json' },
    });
    if (!res.ok) {
      return { enabled: true, byName: new Map(), message: `IPO Guru returned ${res.status}` };
    }
    const payload = await res.json();
    const rows = payload?.data || payload?.ipos || [];
    const byName = new Map();
    for (const row of rows) {
      const nameKey = String(row.name || '')
        .toLowerCase()
        .replace(/\s+limited|\s+ltd\.?|\s+ipo/gi, '')
        .trim();
      byName.set(nameKey, row);
      if (row.symbol) byName.set(String(row.symbol).toUpperCase(), row);
    }
    return { enabled: true, byName, message: null };
  } catch (err) {
    logger.warn(`IPO Guru fetch failed: ${err.message}`);
    return { enabled: true, byName: new Map(), message: err.message };
  }
}

function matchGuru(ipo, guru) {
  if (!guru.enabled || !guru.byName.size) return null;
  if (ipo.symbol && guru.byName.has(ipo.symbol)) return guru.byName.get(ipo.symbol);
  const nameKey = String(ipo.company_name || '')
    .toLowerCase()
    .replace(/\s+limited|\s+ltd\.?|\s+ipo/gi, '')
    .trim();
  for (const [key, row] of guru.byName.entries()) {
    if (typeof key !== 'string' || key.length < 4) continue;
    if (nameKey.includes(key) || key.includes(nameKey)) return row;
  }
  return null;
}

function attachGmp(ipo, guruRow) {
  if (!guruRow?.gmp) {
    return {
      ...ipo,
      gmp: {
        available: false,
        price: null,
        percentage: null,
        estimated_listing_price: null,
        estimated_listing_gain_pct: null,
        updated_at: null,
        note: env.IPO_GURU_API_KEY
          ? 'GMP not found for this issue in IPO Guru feed'
          : 'Add free IPO_GURU_API_KEY (ipoguru.in) for live grey market premium',
      },
      category: ipo.category || (guruRow?.type || 'unknown'),
      allotment_date: ipo.allotment_date || guruRow?.allotment_date || null,
      listing_date: ipo.listing_date || guruRow?.listing_date || null,
      issue_size_label: ipo.issue_size_label || guruRow?.issue_size || null,
      sale_type: guruRow?.sale_type || null,
      registrar: ipo.registrar || guruRow?.registrar || null,
    };
  }

  const gmpPrice = num(guruRow.gmp.price) || 0;
  const issuePrice = num(guruRow.issue_price) || ipo.issue_price || ipo.issue_price_high;
  // IPO Guru usually sends percentage like "6" for 6%
  let gainPct = num(guruRow.gmp.percentage);
  if (gainPct != null) {
    gainPct = Math.abs(gainPct) > 1 ? gainPct / 100 : gainPct;
  } else if (issuePrice) {
    gainPct = gmpPrice / issuePrice;
  }

  return {
    ...ipo,
    category: String(guruRow.type || ipo.category || 'unknown').toLowerCase(),
    allotment_date: guruRow.allotment_date || ipo.allotment_date || null,
    listing_date: guruRow.listing_date || ipo.listing_date || null,
    issue_size_label: guruRow.issue_size || ipo.issue_size_label || null,
    sale_type: guruRow.sale_type || null,
    registrar: ipo.registrar || guruRow.registrar || null,
    lot_size: ipo.lot_size || num(guruRow.lot_size),
    face_value: ipo.face_value || num(guruRow.face_value),
    gmp: {
      available: true,
      price: gmpPrice,
      percentage: gainPct,
      estimated_listing_price: issuePrice != null ? issuePrice + gmpPrice : null,
      estimated_listing_gain_pct: gainPct,
      updated_at: guruRow.gmp.updated_at || null,
      note: 'Grey market premium is unofficial and can change quickly — not a guarantee of listing gains.',
    },
  };
}

function analyzeIpo(ipo) {
  const sub = ipo.subscription || {};
  const strengths = [];
  const risks = [];
  const checklist = [];

  let demand = 45;
  if (sub.total != null) {
    if (sub.total >= 10) {
      demand += 35;
      strengths.push(`Overall subscription ~${sub.total.toFixed(2)}× — strong demand`);
    } else if (sub.total >= 3) {
      demand += 20;
      strengths.push(`Overall subscription ~${sub.total.toFixed(2)}× — healthy demand`);
    } else if (sub.total >= 1) {
      demand += 8;
      strengths.push(`Overall subscription ~${sub.total.toFixed(2)}× — just covering the issue`);
    } else {
      demand -= 15;
      risks.push(`Overall subscription only ~${sub.total.toFixed(2)}× — issue not fully covered yet`);
    }
  }

  let retailInterest = 45;
  if (sub.retail != null) {
    if (sub.retail >= 5) {
      retailInterest += 30;
      strengths.push(`Retail subscribed ~${sub.retail.toFixed(2)}×`);
    } else if (sub.retail >= 1) {
      retailInterest += 15;
    } else {
      retailInterest -= 10;
      risks.push(`Retail subscription weak (~${sub.retail.toFixed(2)}×)`);
    }
  }

  if (sub.qib != null) {
    if (sub.qib >= 5) strengths.push(`QIB interest solid (~${sub.qib.toFixed(2)}×)`);
    else if (sub.qib < 0.5) risks.push(`QIB participation still thin (~${sub.qib.toFixed(2)}×)`);
  }

  let listingOutlook = 45;
  const gmp = ipo.gmp;
  if (gmp?.available && gmp.estimated_listing_gain_pct != null) {
    const g = gmp.estimated_listing_gain_pct;
    if (g >= 0.2) {
      listingOutlook += 30;
      strengths.push(`GMP implies ~${(g * 100).toFixed(1)}% listing premium (unofficial)`);
    } else if (g >= 0.05) {
      listingOutlook += 15;
      strengths.push(`Modest positive GMP (~${(g * 100).toFixed(1)}%)`);
    } else if (g > -0.05) {
      listingOutlook += 0;
      risks.push('GMP near flat — limited implied listing pop');
    } else {
      listingOutlook -= 20;
      risks.push(`Negative GMP (~${(g * 100).toFixed(1)}%) — grey market expects listing discount`);
    }
  } else {
    listingOutlook -= 5;
    risks.push('No live GMP wired — listing-gain view is subscription-based only');
  }

  let riskScore = 55;
  if (String(ipo.category).toLowerCase().includes('sme')) {
    riskScore -= 15;
    risks.push('SME IPO — typically higher volatility and thinner liquidity after listing');
  }
  if (ipo.min_investment && ipo.min_investment > 200000) {
    riskScore -= 5;
    risks.push(`High minimum ticket (~₹${Math.round(ipo.min_investment).toLocaleString('en-IN')})`);
  }
  if (sub.total != null && sub.total < 1) riskScore -= 10;

  demand = clamp(demand);
  retailInterest = clamp(retailInterest);
  listingOutlook = clamp(listingOutlook);
  riskScore = clamp(riskScore);

  const overall = clamp(demand * 0.35 + retailInterest * 0.25 + listingOutlook * 0.25 + riskScore * 0.15);

  checklist.push({
    item: 'Issue is open / dates clear',
    status: ipo.status === 'open' ? 'ok' : 'watch',
    note: `${ipo.issue_start_date || '—'} → ${ipo.issue_end_date || '—'}`,
  });
  checklist.push({
    item: 'Know your lot size & cash needed',
    status: ipo.lot_size && ipo.issue_price ? 'ok' : 'watch',
    note:
      ipo.lot_size && ipo.issue_price
        ? `${ipo.lot_size} shares × ₹${ipo.issue_price} ≈ ₹${Math.round(ipo.lot_size * ipo.issue_price).toLocaleString('en-IN')}`
        : 'Lot / price still incomplete on feed',
  });
  checklist.push({
    item: 'Check subscription before last day',
    status: sub.total != null ? 'ok' : 'watch',
    note: sub.updated_at || 'Live NSE subscription when bidding is active',
  });
  checklist.push({
    item: 'Treat GMP as rumour, not fact',
    status: 'watch',
    note: 'Grey market is unofficial and can reverse overnight',
  });

  let verdict =
    'Mixed signals — read strengths/risks and only apply if you accept allotment odds and post-listing volatility.';
  if (overall >= 70) {
    verdict =
      'Demand looks supportive for a retail look-in, but allotment is still a lottery and GMP (if any) is not guaranteed.';
  } else if (overall < 40) {
    verdict =
      'Weak demand and/or soft listing outlook. Retail investors should be extra cautious or skip unless they have a long-term thesis.';
  }

  const expectedPct = gmp?.available ? gmp.estimated_listing_gain_pct : null;
  const expectedRupees = expectedPct != null && ipo.issue_price != null ? expectedPct * ipo.issue_price : null;

  return {
    overall_score: overall,
    overall_label: scoreBand(overall),
    verdict,
    pillars: {
      demand,
      retail_interest: retailInterest,
      listing_outlook: listingOutlook,
      risk: riskScore,
    },
    listing_gains: {
      expected_pct: expectedPct,
      expected_rupees_per_share: expectedRupees,
      confidence: gmp?.available ? 'medium-low' : 'low',
      disclaimer:
        'Estimated listing gains from grey market premium are speculative. Many IPOs list far from GMP. Never decide only on GMP.',
    },
    strengths,
    risks,
    checklist,
    recommendation_for_retail:
      overall >= 65
        ? 'Reasonable to consider a small retail application if you understand allotment odds and can hold through listing volatility.'
        : overall >= 45
          ? 'Neutral — wait for stronger subscription/GMP clarity, or apply only with money you can lock without stress.'
          : 'Prefer to avoid or keep very small — demand/listing outlook does not look retail-friendly right now.',
  };
}

async function loadOpenIpos() {
  const [current, upcomingWrap, guru] = await Promise.all([
    nseGet('/api/ipo-current-issue'),
    nseGet('/api/upcoming-issues').catch(() => ({})),
    fetchIpoGuruMap(),
  ]);

  const bySymbol = new Map();
  for (const row of Array.isArray(current) ? current : []) {
    if (!row?.symbol) continue;
    // NSE returns one row per category; keep Total / first
    const existing = bySymbol.get(row.symbol);
    if (!existing || row.category === 'Total') {
      bySymbol.set(row.symbol, normalizeFromCurrent(row));
    }
  }

  const active = upcomingWrap?.active || [];
  for (const block of active) {
    const row = block?.data || block;
    if (!row?.symbol) continue;
    if (!bySymbol.has(row.symbol)) bySymbol.set(row.symbol, normalizeFromCurrent({ ...row, status: 'Active' }));
  }

  const bases = [...bySymbol.values()];
  const detailed = await Promise.all(
    bases.map(async (base) => {
      try {
        const detail = await nseGet(`/api/ipo-detail?symbol=${encodeURIComponent(base.symbol)}`);
        let ipo = enrichFromDetail(base, detail);
        ipo.min_investment =
          ipo.lot_size && ipo.issue_price ? ipo.lot_size * ipo.issue_price : null;
        const guruRow = matchGuru(ipo, guru);
        ipo = attachGmp(ipo, guruRow);
        ipo.analysis = analyzeIpo(ipo);
        return ipo;
      } catch (err) {
        logger.warn(`IPO detail failed for ${base.symbol}: ${err.message}`);
        let ipo = attachGmp(base, matchGuru(base, guru));
        ipo.subscription = {
          qib: null,
          nii: null,
          retail: null,
          total: base.subscription_total_quick,
          updated_at: null,
          categories: [],
        };
        ipo.analysis = analyzeIpo(ipo);
        return ipo;
      }
    }),
  );

  return {
    as_of: new Date().toISOString(),
    source: {
      primary: 'NSE India public IPO APIs',
      gmp: guru.enabled ? 'IPO Guru' : 'not configured',
      gmp_message: guru.message,
    },
    count: detailed.length,
    ipos: detailed.sort((a, b) => (b.analysis?.overall_score || 0) - (a.analysis?.overall_score || 0)),
  };
}

export async function listIpos(status = 'open') {
  const cacheKey = `ipo:list:${status}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  if (status === 'upcoming' || status === 'closed') {
    // NSE upcoming bundle overlaps with open; closed needs past issues feed
    const past = status === 'closed' ? await nseGet('/api/public-past-issues').catch(() => []) : [];
    const upcoming = status === 'upcoming' ? await nseGet('/api/upcoming-issues').catch(() => ({})) : {};
    const rows =
      status === 'closed'
        ? (Array.isArray(past) ? past : []).map((row) => ({
            symbol: String(row.htmSym || row.company || '').toUpperCase(),
            company_name: row.company,
            status: 'closed',
            issue_start_date: row.ipoStartDate,
            issue_end_date: row.ipoEndDate,
            listing_date: row.listingDate || null,
            issue_price: row.issuePrice,
            source: 'nse',
            gmp: { available: false, note: 'GMP not available for closed snapshot' },
            analysis: null,
          }))
        : (upcoming?.upcoming || upcoming?.active || [])
            .map((block) => block?.data || block)
            .filter((row) => row?.symbol)
            .map((row) => normalizeFromCurrent({ ...row, status: 'Upcoming' }));

    const payload = {
      as_of: new Date().toISOString(),
      source: { primary: 'NSE India', gmp: 'n/a' },
      count: rows.length,
      ipos: rows,
    };
    return setCache(cacheKey, payload, 10);
  }

  const open = await loadOpenIpos();
  return setCache(cacheKey, open, 5);
}

export async function getIpo(symbolInput) {
  const symbol = String(symbolInput || '').trim().toUpperCase();
  if (!symbol) throw badRequest('IPO symbol is required');
  const list = await listIpos('open');
  const found = list.ipos.find((i) => i.symbol === symbol);
  if (found) return found;

  // Fallback: try NSE detail directly
  try {
    const detail = await nseGet(`/api/ipo-detail?symbol=${encodeURIComponent(symbol)}`);
    const base = normalizeFromCurrent({
      symbol,
      companyName: detail.companyName || symbol,
      issuePrice: '',
      status: 'Active',
    });
    let ipo = enrichFromDetail(base, detail);
    const guru = await fetchIpoGuruMap();
    ipo = attachGmp(ipo, matchGuru(ipo, guru));
    ipo.min_investment = ipo.lot_size && ipo.issue_price ? ipo.lot_size * ipo.issue_price : null;
    ipo.analysis = analyzeIpo(ipo);
    return ipo;
  } catch {
    throw notFound(`IPO ${symbol} not found in current NSE open issues`);
  }
}

export async function getIpoAnalysis(symbolInput) {
  const ipo = await getIpo(symbolInput);
  return {
    as_of: new Date().toISOString(),
    ipo,
    analysis: ipo.analysis || analyzeIpo(ipo),
    how_to_use: [
      '1) Confirm open/close dates and UPI cut-off on the last day',
      '2) Check lot size × upper price band = cash you must block',
      '3) Read QIB / NII / Retail subscription — strong QIB usually healthier than retail-only frenzy',
      '4) Treat GMP as a rumour board, not a promise',
      '5) Apply only money you can afford to lock until listing / refund',
    ],
    disclaimer:
      'Educational IPO research only — not investment advice. Grey market premium is unofficial. Always verify on NSE/BSE and the RHP.',
  };
}
