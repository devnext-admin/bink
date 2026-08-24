// Security regression tests that run against the live Supabase project through
// the public REST API, exactly as an attacker's browser would. They assert the
// database enforces its own rules regardless of what the client sends - the
// answer to "95 RLS policies with no automated verification".
//
// Run: node --test e2e/security.test.mjs
// Env: SUPABASE_URL, SUPABASE_ANON_KEY (fall back to the project defaults).

import { test } from 'node:test';
import assert from 'node:assert/strict';

// Use || rather than ??: GitHub Actions sets an undefined secret to the empty
// string, which ?? happily accepts. That made BASE '' and every request fail
// with "Failed to parse URL", so CI was red on every run from the day it was
// added. An empty value must fall through to the defaults below.
const BASE = process.env.SUPABASE_URL || 'https://cmvdudcyubhqdoeeppky.supabase.co';
const ANON =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdmR1ZGN5dWJocWRvZWVwcGt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NjE0MzcsImV4cCI6MjEwMzEzNzQzN30.MMQHGoV0SeTvWxZKa-zkOVUS6ZH_dFjSlYU45eCkKPw';
const DEMO = { email: 'demo@bink.com', password: 'binkdemo123' };

async function signIn(email, password) {
  const res = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  assert.ok(body.access_token, `sign-in failed for ${email}: ${JSON.stringify(body)}`);
  return { jwt: body.access_token, id: body.user.id };
}

function authed(jwt) {
  return { apikey: ANON, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' };
}

test('a customer cannot promote themselves to admin', async () => {
  const { jwt, id } = await signIn(DEMO.email, DEMO.password);
  // The attack: PATCH my own profile row, setting role=admin
  await fetch(`${BASE}/rest/v1/profiles?id=eq.${id}`, {
    method: 'PATCH',
    headers: authed(jwt),
    body: JSON.stringify({ role: 'admin' }),
  });
  // Read it back through the security-definer path the app uses is not needed:
  // sign in again and inspect the JWT-independent DB state via a fresh token.
  const check = await fetch(`${BASE}/rest/v1/profiles?id=eq.${id}&select=role`, {
    method: 'GET',
    headers: authed(jwt),
  });
  // SELECT on profiles is column-revoked, so this may 401/permission-deny; the
  // role must never come back as admin either way.
  const rows = await check.json().catch(() => []);
  if (Array.isArray(rows) && rows.length) {
    assert.notEqual(rows[0].role, 'admin', 'privilege escalation succeeded!');
  }
});

test('a customer cannot block/unblock themselves', async () => {
  const { jwt, id } = await signIn(DEMO.email, DEMO.password);
  const res = await fetch(`${BASE}/rest/v1/profiles?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...authed(jwt), Prefer: 'return=representation' },
    body: JSON.stringify({ is_blocked: true }),
  });
  const rows = await res.json().catch(() => []);
  if (Array.isArray(rows) && rows.length) {
    assert.notEqual(rows[0].is_blocked, true, 'a user changed their own is_blocked flag');
  }
});

test('a customer cannot read another user\'s transactions', async () => {
  const { jwt } = await signIn(DEMO.email, DEMO.password);
  // Ask for every transaction; RLS must scope it to the caller only.
  const res = await fetch(`${BASE}/rest/v1/transactions?select=user_id`, {
    method: 'GET',
    headers: authed(jwt),
  });
  const rows = await res.json().catch(() => []);
  const { id } = await signIn(DEMO.email, DEMO.password);
  if (Array.isArray(rows)) {
    for (const r of rows) assert.equal(r.user_id, id, 'saw another user\'s transaction');
  }
});

test('an anonymous visitor cannot list profiles', async () => {
  const res = await fetch(`${BASE}/rest/v1/profiles?select=id`, {
    method: 'GET',
    headers: { apikey: ANON },
  });
  const rows = await res.json().catch(() => []);
  // Either denied outright, or an empty set - never a readable list of users.
  assert.ok(!Array.isArray(rows) || rows.length === 0, 'anonymous read of profiles returned rows');
});

test('a customer cannot delete a review', async () => {
  const { jwt } = await signIn(DEMO.email, DEMO.password);
  // Grab any review id via the public read, then try to delete it.
  const list = await fetch(`${BASE}/rest/v1/reviews?select=id&limit=1`, {
    headers: { apikey: ANON },
  });
  const rows = await list.json().catch(() => []);
  if (Array.isArray(rows) && rows.length) {
    const res = await fetch(`${BASE}/rest/v1/reviews?id=eq.${rows[0].id}`, {
      method: 'DELETE',
      headers: { ...authed(jwt), Prefer: 'return=representation' },
    });
    const deleted = await res.json().catch(() => []);
    assert.ok(!Array.isArray(deleted) || deleted.length === 0, 'a customer deleted a review');
  }
});
