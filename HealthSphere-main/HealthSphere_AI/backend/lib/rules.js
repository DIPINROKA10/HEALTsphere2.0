import { labelOf } from './trends.js';
import { bmi } from './util.js';

/* ============================================================
   MODEL 3 — RECOMMENDATION / RISK ENGINE (rule layer)
   Evidence-informed clinical rules → risk SIGNALS (never diagnoses),
   each with explainability ("Why am I seeing this?").
   Every factor now carries a WEIGHT and a SOURCE so each signal also
   has a 0–10 strength score with a visible breakdown ("why this score"),
   and signals can be ranked deterministically. Weights never decide
   severity on their own — severity keeps its explicit per-rule logic and
   the score is derived FROM severity + factor weights, so the two can
   never disagree.
   A SAFETY LAYER sanitizes all output before it reaches the user.
   ============================================================ */

const FAM_MAP = {
  diabetes: /\bdiabet/i,
  heart: /(heart|cardiac|cardio|coronary|\bmi\b|stroke|hypertension|blood pressure)/i,
  thyroid: /thyroid/i,
  kidney: /kidney|renal/i,
  cancer: /cancer|carcinoma|tumor|tumour|malignan/i,
  obesity: /obes/i
};

function familyHas(family, re) {
  return (family || []).filter(m => (m.conditions || []).some(c => re.test(c.name || '')));
}

/* Weighted-factor collector. Each factor = { text, weight, source } where
   source ∈ 'latest_value' | 'trend' | 'family' | 'lifestyle' | 'profile'. */
function FactorList() {
  const items = [];
  return {
    add(text, weight = 1, source = 'latest_value') { if (text) items.push({ text, weight, source }); },
    texts() { return items.map(i => i.text); },
    raw: items,
    score(sev) {
      const base = sev === 'attention' ? 4 : sev === 'watch' ? 2 : 0;
      const sum = items.reduce((s, i) => s + i.weight, 0);
      return Math.max(0, Math.min(10, base + sum));
    }
  };
}

/** Shared signal-shaper so every signal carries the same explainability fields. */
function makeSignal({ id, area, severity, factors, action, dataConsidered }) {
  const texts = factors.texts();
  return {
    id, area, severity,
    score: factors.score(severity),
    factorsWeighted: factors.raw,
    factors: texts,
    action,
    why: texts.map(x => ({ label: x })),
    dataConsidered
  };
}

/**
 * @param ctx { profile, family, series: {key -> analyzeSeries result}, latest: {key->entry} }
 */
export function computeSignals(ctx) {
  const { profile = {}, family = [], series = {}, latest = {} } = ctx;
  const signals = [];
  const age = profile.dob ? Math.floor((Date.now() - new Date(profile.dob)) / (365.25 * 24 * 3600 * 1000)) : null;
  const sex = String(profile.sex || '').toLowerCase();
  const userBmi = bmi(profile.heightCm, profile.weightKg);
  const dataWindow = 'All records in your health graph';

  /* ---- Metabolic / prediabetes-range pattern ---- */
  {
    const f = FactorList();
    let sev = 0;
    const a1c = latest.hba1c;
    if (a1c) {
      if (a1c.value >= 5.7) { f.add(`Latest HbA1c is ${a1c.value}% (above the 4.0–5.7% typical band)`, a1c.value >= 6.0 ? 3 : 2, 'latest_value'); sev = Math.max(sev, a1c.value >= 6.0 ? 2 : 1); }
      if (series.hba1c?.direction === 'increasing') f.add('HbA1c trend across your reports is increasing', 2, 'trend');
    }
    const g = latest.glucose_fasting;
    if (g && g.value >= 100) { f.add(`Fasting glucose ${g.value} mg/dL (typical band 70–99)`, g.value >= 126 ? 3 : 2, 'latest_value'); sev = Math.max(sev, g.value >= 126 ? 2 : 1); }
    const famDiab = familyHas(family, FAM_MAP.diabetes);
    if (famDiab.length) f.add(`Family history: ${famDiab.map(m => m.relation).join(', ')} — diabetes-related condition recorded`, 2, 'family');
    if (userBmi && userBmi >= 25) f.add(`BMI ${userBmi}`, 1, 'profile');
    const act = profile.lifestyle?.activityLevel;
    if (act === 'sedentary' || act === 'light') f.add(`Reported activity level: ${act || 'light'}`, 1, 'lifestyle');
    if (age && age >= 35) f.add(`Age ${age}`, 1, 'profile');

    if (f.raw.length >= 2 || sev > 0) {
      const severity = sev >= 2 ? 'attention' : 'watch';
      signals.push(makeSignal({
        id: 'metabolic', area: 'Metabolic & blood-sugar health', severity, factors: f,
        action: 'Consider discussing your blood-sugar pattern and trend with a qualified healthcare professional.',
        dataConsidered: dataWindow
      }));
    }
  }

  /* ---- Cardiovascular ---- */
  {
    const f = FactorList();
    let sev = 0;
    const sys = series.bp_systolic, dia = series.bp_diastolic;
    const elevatedReadings = countAbove(latest._bpList || [], s => s.value > 130);
    if (sys?.last && sys.last.value >= 130) { f.add(`Recent systolic BP ${sys.last.value} mmHg`, sys.last.value >= 140 ? 3 : 2, 'latest_value'); sev = Math.max(sev, sys.last.value >= 140 ? 2 : 1); }
    else if (elevatedReadings >= 1) { f.add(`${elevatedReadings} systolic reading(s) above 130 mmHg on record`, 1, 'latest_value'); sev = Math.max(sev, 1); }
    if (dia?.last && dia.last.value >= 85) { f.add(`Recent diastolic BP ${dia.last.value} mmHg`, 1, 'latest_value'); sev = Math.max(sev, 1); }
    if (series.bp_systolic?.direction === 'increasing' || series.bp_diastolic?.direction === 'increasing') f.add('Blood-pressure trend is increasing across your records', 2, 'trend');
    const ldl = latest.ldl;
    if (ldl && ldl.value >= 130) { f.add(`LDL cholesterol ${ldl.value} mg/dL (optimal <100)`, 2, 'latest_value'); sev = Math.max(sev, 1); }
    const tg = latest.triglycerides;
    if (tg && tg.value >= 150) f.add(`Triglycerides ${tg.value} mg/dL`, 1, 'latest_value');
    const hdl = latest.hdl;
    if (hdl && hdl.flag === 'low') f.add(`HDL cholesterol ${hdl.value} mg/dL (below the usual band)`, 1, 'latest_value');
    const famHeart = familyHas(family, FAM_MAP.heart);
    if (famHeart.length) f.add(`Family history: ${famHeart.map(m => m.relation).join(', ')} — cardiovascular-related condition(s) recorded`, 2, 'family');
    if (profile.lifestyle?.smoking === 'current') { f.add('Current smoker', 3, 'lifestyle'); sev = Math.max(sev, 2); }
    if (userBmi && userBmi >= 27) f.add(`BMI ${userBmi}`, 1, 'profile');
    const hrLogs = (latest._exerciseAvg ?? null);
    if (hrLogs !== null && hrLogs < 60) f.add(`Low weekly activity (~${Math.round(hrLogs)} min/week logged)`, 1, 'lifestyle');

    if (f.raw.length >= 2 || sev > 0) {
      const severity = sev >= 2 ? 'attention' : 'watch';
      signals.push(makeSignal({
        id: 'cardio', area: 'Cardiovascular health', severity, factors: f,
        action: 'Your profile contains several cardiovascular-related factors. Consider discussing your overall cardiovascular risk with a healthcare professional — a primary-care physician can help decide whether specialist evaluation is appropriate.',
        dataConsidered: dataWindow
      }));
    }
  }

  /* ---- Thyroid ---- */
  {
    const tsh = latest.tsh;
    const famThy = familyHas(family, FAM_MAP.thyroid);
    const f = FactorList();
    let sev = 0;
    if (tsh && tsh.flag !== 'normal') { f.add(`TSH ${tsh.value} µIU/mL (${tsh.flag} vs usual 0.4–4.0 band)`, 2, 'latest_value'); sev = 1; }
    if (tsh && tsh.flag === 'normal' && famThy.length) f.add('Family history of thyroid conditions with a normal recent TSH', 1, 'family');
    if (famThy.length && !tsh) f.add(`Family history: ${famThy.map(m => m.relation).join(', ')} — thyroid condition recorded; no TSH on file`, 1, 'family');
    if (f.raw.length && (tsh?.flag !== 'normal' ? true : f.texts().some(x => x.includes('no TSH')))) {
      signals.push(makeSignal({
        id: 'thyroid', area: 'Thyroid health', severity: sev ? 'watch' : 'info', factors: f,
        action: 'If relevant to you, thyroid function is a common topic to review with a doctor during routine check-ups.',
        dataConsidered: dataWindow
      }));
    }
  }

  /* ---- Kidney ---- */
  {
    const f = FactorList(); let sev = 0;
    const cr = latest.creatinine, egfr = latest.egfr;
    if (cr && cr.flag !== 'normal') { f.add(`Creatinine ${cr.value} mg/dL outside usual band`, 2, 'latest_value'); sev = 1; }
    if (egfr && egfr.value < 90) { f.add(`Estimated GFR ${egfr.value} mL/min/1.73m²`, egfr.value < 60 ? 3 : 2, 'latest_value'); sev = egfr.value < 60 ? 2 : 1; }
    const bpHigh = latest.bp_systolic && latest.bp_systolic.value >= 130;
    if (bpHigh) f.add('Blood-pressure readings above 130 mmHg can affect kidney health over time', 1, 'latest_value');
    if (f.raw.length >= 2 || sev > 0) {
      const severity = sev >= 2 ? 'attention' : 'watch';
      signals.push(makeSignal({
        id: 'kidney', area: 'Kidney health', severity, factors: f,
        action: 'Kidney markers are worth reviewing alongside blood pressure with your healthcare professional.',
        dataConsidered: dataWindow
      }));
    }
  }

  /* ---- Nutrition / anemia ---- */
  {
    const f = FactorList();
    const hb = latest.hemoglobin, vd = latest.vitamin_d, b12 = latest.vitamin_b12;
    if (hb && hb.flag === 'low') f.add(`Hemoglobin ${hb.value} g/dL below the usual band for your profile`, 2, 'latest_value');
    if (vd && vd.flag === 'low') f.add(`Vitamin D ${vd.value} ng/mL below the usual band`, 2, 'latest_value');
    if (b12 && b12.flag === 'low') f.add(`Vitamin B12 ${b12.value} pg/mL below the usual band`, 2, 'latest_value');
    if (f.raw.length >= 2) {
      signals.push(makeSignal({
        id: 'nutrition', area: 'Nutritional markers', severity: 'watch', factors: f,
        action: 'Nutritional deficiencies are common and generally easy to discuss at a routine visit.',
        dataConsidered: dataWindow
      }));
    } else if (f.raw.length === 1) {
      signals.push(makeSignal({
        id: 'nutrition-lite', area: 'Nutritional markers', severity: 'info', factors: f,
        action: 'You may want to include this marker in your next routine blood test discussion.',
        dataConsidered: dataWindow
      }));
    }
  }

  /* ---- Liver ---- */
  {
    const alt = latest.alt, ast = latest.ast;
    const f = FactorList();
    if (alt && alt.flag !== 'normal') f.add(`ALT (SGPT) ${alt.value} U/L above the usual band`, 2, 'latest_value');
    if (ast && ast.flag !== 'normal') f.add(`AST (SGOT) ${ast.value} U/L above the usual band`, 2, 'latest_value');
    if (f.raw.length) signals.push(makeSignal({
      id: 'liver', area: 'Liver enzymes', severity: 'watch', factors: f,
      action: 'Liver enzymes can fluctuate; repeating the test and discussing with a doctor is a common approach.',
      dataConsidered: dataWindow
    }));
  }

  /* ---- Sleep & lifestyle info ---- */
  {
    const f = FactorList();
    if (series.sleep_hours?.mean && series.sleep_hours.mean < 6.5) f.add(`Average sleep ~${series.sleep_hours.mean.toFixed(1)} h/night across recent logs`, 1, 'lifestyle');
    if (series.sleep_hours?.direction === 'decreasing' && series.sleep_hours.totalChange <= -0.8) f.add('Sleep duration trending down in your logs', 1, 'trend');
    if (f.raw.length) signals.push(makeSignal({
      id: 'sleep', area: 'Sleep & recovery', severity: 'info', factors: f,
      action: 'Consistent sleep timing is one of the most impactful lifestyle habits — consider discussing persistent issues with a professional.',
      dataConsidered: 'Last 30 days of lifestyle logs'
    }));
  }

  /* ---- Missing-data nudges (PRD 8.7) ---- */
  for (const key of ['hba1c', 'bp_systolic', 'weight']) {
    const a = series[key];
    if (a && a.stale) {
      const f = FactorList();
      f.add(`${labelOf(key)} has no readings for ${a.daysSinceLast} days`, 1, 'profile');
      signals.push(makeSignal({
        id: `stale_${key}`, area: 'Data completeness', severity: 'info', factors: f,
        action: 'Adding a fresh reading keeps your trends and guidance accurate.',
        dataConsidered: dataWindow
      }));
    }
  }

  /* Rank: severity bucket first (unchanged semantics), then strength score,
     then factor count — so the strongest evidence floats up within a bucket. */
  const order = { attention: 0, watch: 1, info: 2 };
  return signals.sort((a, b) =>
    order[a.severity] - order[b.severity]
    || (b.score || 0) - (a.score || 0)
    || (b.factors?.length || 0) - (a.factors?.length || 0));
}

function countAbove(list, fn) { return (list || []).filter(fn).length; }

/* ---------------- SAFETY LAYER ---------------- */
const BANNED = /\b(diagnos(e|es|is|ed)|you have \w+ disease|prescri(b|ption)|dosage|guarantee\w*|cure)\b/gi;

export function safetySanitize(signals) {
  const cleaned = signals
    .filter(s => Array.isArray(s.factors) && s.factors.length > 0)
    .map(s => ({
      ...s,
      title: stripBanned(s.area),
      factors: s.factors.map(stripBanned),
      factorsWeighted: (s.factorsWeighted || []).map(w => ({ ...w, text: stripBanned(w.text) })),
      action: stripBanned(s.action) + disclaimerSuffix(s.severity)
    }));
  return {
    signals: cleaned,
    disclaimers: [
      'HealthSphere AI provides information and organization support — it does not diagnose conditions or replace medical professionals.',
      'Risk "signals" are pattern observations from your own records and general guidance, not predictions or diagnoses.'
    ]
  };
}

export function stripBanned(s) { return String(s).replace(BANNED, 'assess'); }
function disclaimerSuffix(sev) {
  if (sev === 'attention') return ' Please seek professional evaluation rather than self-interpreting.';
  return '';
}
