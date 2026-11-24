/* Insights Explanation Layer — provider-interface + offline template.
   Mirrors the summarize.js design exactly, so new providers can be swapped
   in via AI_PROVIDER env without touching callers.

   Providers:
   - offline  (default): deterministic template that concatenates factors and
     cites article titles from the Research Hub corpus. Always safe, never
     hallucinates, zero network, zero cost.
   - ollama : plain fetch to a local Ollama server, 20s timeout, then fall
     back to offline. Set AI_PROVIDER=ollama to enable.
   - openai : requires OPENAI_API_KEY; throws a clear error when unset.

   STATUS: this module is NOT yet wired into any API route — insights are
   currently rendered from rules.js factors alone. See FINAL_REVIEW.md. */

import { retrieve } from '../rag.js';

export const EXPLANATION_PROVIDER_VERSION = '1.0';

/* ---- provider interface (match summarize.js contract) ---- */
export async function explainSignal({ signalId, factors, dataConsidered, signals, signalsWithFactors }) {
  const p = process.env.AI_PROVIDER || 'offline';
  const provider = LOAD_PROVIDERS().get(p);
  if (!provider) throw new Error(`Unknown explanation provider: ${p}`);
  const raw = await provider({ signalId, factors, dataConsidered, signals, signalsWithFactors });
  return validateAndWrap(raw, p);
}

/* ---- provider loading (module-level cache, mirrors summarize.js) ---- */
const LOADED = new Map();
function LOAD_PROVIDERS() {
  if (!LOADED.has('offline')) LOADED.set('offline', offlineProvider);
  if (process.env.AI_PROVIDER === 'ollama' && !LOADED.has('ollama')) {
    LOADED.set('ollama', ollamaProvider);
  }
  if (process.env.AI_PROVIDER === 'openai' && !LOADED.has('openai')) {
    LOADED.set('openai', openaiProvider);
  }
  return LOADED;
}

function offlineProvider(args) {
  return _explainTemplate({ ...args, source: 'offline' });
}

async function ollamaProvider({ signalId, factors, dataConsidered, signals }) {
  try {
    const resp = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'phi:2.7b',
        prompt: _promptBuilder({ signalId, factors, dataConsidered, signals })
      }),
      signal: AbortSignal.timeout(20000)
    });
    if (!resp.ok) return _explainTemplate({ signalId, factors, dataConsidered, signals });
    const data = await resp.json();
    return {
      explanation: data.response || '',
      citations: _citations(factors),
      generatedBy: 'ollama'
    };
  } catch {
    /* never fail the request — fall back to the offline template */
    return _explainTemplate({ signalId, factors, dataConsidered, signals });
  }
}

async function openaiProvider({ signalId, factors, dataConsidered, signals }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI provider not set: set OPENAI_API_KEY or use AI_PROVIDER=offline');
  }
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: _promptBuilder({ signalId, factors, dataConsidered, signals }) }]
    }),
    signal: AbortSignal.timeout(20000)
  });
  const data = await resp.json();
  return {
    explanation: data.choices?.[0]?.message?.content || 'No response',
    citations: _citations(factors),
    generatedBy: 'openai'
  };
}

function _promptBuilder({ signalId, factors, dataConsidered, signals }) {
  const fList = factors.texts().map(t => `- ${t}`).join('\n');
  const sev = (signals || []).find(s => s.id === signalId)?.severity || 'watch';
  return `You are a health-info assistant. Using ONLY the FACTORS below, explain in 4-6 plain-language sentences why this pattern (severity: ${sev}) is worth discussing with a qualified healthcare professional. Do NOT diagnose, never give risk percentages, never prescribe.

  FACTORS:
  ${fList}

  PATIENT CONTEXT: ${dataConsidered || 'Your health graph records.'}

  Cite any relevant article titles as [1], [2] if they help the explanation. If the factors do not support a conclusion, say so.

  EXPLANATION:`;
}

/* Top-k Research Hub citations for the first factor (offline, deterministic). */
function _citations(factors) {
  try {
    const texts = factors?.texts?.() || [];
    if (!texts.length) return [];
    return retrieve(texts[0], { k: 3 }).map(a => ({
      title: a.title, source: a.sourceId, evidence: a.evidence
    }));
  } catch {
    return [];
  }
}

/* Template that runs when no LLM is configured — the feature works offline. */
function _explainTemplate({ signalId, factors, dataConsidered, signals }) {
  const signal = (signals || []).find(s => s.id === signalId);
  if (!signal) return { explanation: 'Signal not found', citations: [], generatedBy: 'offline' };
  const texts = factors?.texts?.() || [];
  const fList = texts.map(t => `- ${t}`).join('\n');
  let explanation = '';
  if (fList) {
    explanation = `Based on your health records, the following factors were noted: ${fList}. `;
    if (signal.severity === 'attention') {
      explanation += 'This pattern suggests reviewing your recent lab values and family history with a qualified professional.';
    } else if (signal.severity === 'watch') {
      explanation += 'This pattern is worth mentioning at your next routine visit.';
    } else {
      explanation += 'This pattern was observed; discuss it with your doctor at your next appointment.';
    }
  } else {
    explanation = 'No factor data available to generate an explanation.';
  }
  return { explanation, citations: _citations(factors), generatedBy: 'offline' };
}

/* ---- validation (post-processing, always runs) ---- */
function validateAndWrap(raw, provider) {
  const explanation = raw?.explanation || 'Unable to generate explanation';
  /* strip any banned diagnostic claims — same rule set as rules.js safety layer */
  const clean = explanation.replace(BANNED, 'assess');
  const citations = (raw?.citations || []).filter(c => c && c.title && c.source);
  return {
    explanation: clean,
    citations,
    generatedBy: provider,
    disclaimers: [
      'HealthSphere AI provides information and organization support — it does not diagnose conditions or replace medical professionals.',
      'Risk "signals" are pattern observations from your own records and general guidance, not predictions or diagnoses.'
    ]
  };
}

/* Banned phrases that must never appear in generated output — mirrors rules.js. */
const BANNED = /\b(diagnos(e|es|is|ed)|you have \w+ disease|prescri(b|ption)|dosage|guarantee\w*|cure)\b/gi;

export default { explainSignal };
