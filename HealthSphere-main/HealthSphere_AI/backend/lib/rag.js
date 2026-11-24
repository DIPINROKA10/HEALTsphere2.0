/* Insights RAG layer — retrieval over the Research Hub corpus.
   Retrieves top-k PUBLISHED articles relevant to a risk signal so an
   explanation can be grounded in real, cited sources.

   Design rules:
   - Only `status === 'published'` articles are indexed. Pending / rejected
     / retracted content is never used.
   - Default embedding is a deterministic offline hashed-token vector
     (no network, no keys, no dependencies). An embedding-provider seam
     mirrors research/summarize.js so a real model can be plugged in later
     via EMBEDDING_PROVIDER without touching callers.
   - The index is persisted to rag-index.json (atomic writes) and rebuilt
     only when the corpus hash changes.
   - Article text is untrusted DATA: it is only ever tokenized, never
     interpreted as instructions. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listArticles } from './research/store.js';
import { atomicWriteJson, readJsonSafe } from './atomic.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url)); // backend/lib
const INDEX_PATH = path.join(ROOT, 'data', 'research', 'rag-index.json');

export const RAG_INDEX_VERSION = 1;
const DIM = 256;               // offline vector width
const MIN_SCORE = 0.02;        // below this, a doc is not "relevant"

/* Higher = stronger evidence; used only as a ranking tie-breaker. */
const EVIDENCE_RANK = {
  established_guidance: 6, systematic_review: 5, rct: 4,
  observational: 3, preclinical: 2, experimental: 1, preprint: 0
};

function hashToken(token) {
  let h = 0x811c9dc5;
  for (let i = 0; i < token.length; i++) { h ^= token.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h % DIM;
}

/* Deterministic offline embedding: sublinear-tf hashed bag of tokens,
   L2-normalised. Cheap, stable across runs, zero dependencies. */
export function embed(text) {
  const vec = new Array(DIM).fill(0);
  const tokens = String(text || '').toLowerCase().match(/[a-z][a-z'-]{2,}/g) || [];
  const counts = new Map();
  for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1);
  for (const [t, c] of counts) vec[hashToken(t)] += 1 + Math.log(c);
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return vec.map(v => v / norm);
}

function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }

function corpusHash(articles) {
  const h = crypto.createHash('sha256');
  for (const a of articles) h.update(`${a.id}|${a.title}|${String(a.abstract || '').slice(0, 4000)}\n`);
  return h.digest('hex');
}

function publishedArticles() {
  return (listArticles() || []).filter(a => a && a.status === 'published');
}

let cache = null; // { corpusHash, docs }

function buildDocs(articles) {
  return articles.map(a => ({
    id: a.id,
    title: a.title,
    sourceId: a.sourceId,
    evidence: a.evidence || null,
    url: a.url || null,
    publishedAt: a.publishedAt || null,
    vector: embed(`${a.title} ${a.abstract}`)
  }));
}

function getIndex() {
  const articles = publishedArticles();
  const hash = corpusHash(articles);
  if (cache && cache.corpusHash === hash) return cache;

  const onDisk = readJsonSafe(INDEX_PATH);
  if (onDisk && onDisk.version === RAG_INDEX_VERSION && onDisk.corpusHash === hash
      && Array.isArray(onDisk.docs) && onDisk.docs.length === articles.length) {
    cache = { corpusHash: hash, docs: onDisk.docs };
    return cache;
  }

  cache = { corpusHash: hash, docs: buildDocs(articles) };
  atomicWriteJson(INDEX_PATH, {
    version: RAG_INDEX_VERSION, dim: DIM, corpusHash: hash,
    builtAt: new Date().toISOString(), docs: cache.docs
  });
  return cache;
}

/**
 * Retrieve the k most relevant PUBLISHED articles for a query.
 * @returns [{ id, title, sourceId, evidence, url, publishedAt, score }]
 */
export function retrieve(query, { k = 3 } = {}) {
  const q = String(query || '').trim();
  if (!q) return [];
  const { docs } = getIndex();
  if (!docs.length) return [];
  const qv = embed(q);
  const rank = d => EVIDENCE_RANK[d.evidence] ?? -1;
  return docs
    .map(d => ({ doc: d, s: dot(qv, d.vector) }))
    .filter(x => x.s >= MIN_SCORE)
    .sort((a, b) => b.s - a.s || rank(b.doc) - rank(a.doc))
    .slice(0, Math.max(1, k))
    .map(({ doc, s }) => ({
      id: doc.id, title: doc.title, sourceId: doc.sourceId,
      evidence: doc.evidence, url: doc.url, publishedAt: doc.publishedAt,
      score: Number(s.toFixed(4))
    }));
}

/** Test/ops helper: force a rebuild on the next retrieval. */
export function resetRagCache() { cache = null; }

/** Test/ops helper: point the index file somewhere else (used by tests). */
export function setIndexPathForTests(p) { /* reserved */ }
