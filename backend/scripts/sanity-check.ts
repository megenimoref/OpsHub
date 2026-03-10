/**
 * Sanity check script for password flow
 * Run: npx ts-node scripts/sanity-check.ts
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import sequelize from '../src/config/database';
import User from '../src/models/user';

const TEST_EMAIL = `sanity-test-${Date.now()}@test.local`;
const TEST_PASSWORD = 'TestPass123!';
const NEW_PASSWORD = 'NewPass456!';

let passed = 0;
let failed = 0;

function ok(label: string) {
  console.log(`  ✅ ${label}`);
  passed++;
}
function fail(label: string, detail?: string) {
  console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
  failed++;
}

async function run() {
  await sequelize.authenticate();
  console.log('\n🔍 Password Sanity Check\n');

  let userId: number | null = null;

  // ── Test 1: Create user ──────────────────────────────────────────────────
  console.log('1. Create user');
  try {
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(TEST_PASSWORD, salt);
    const user = await User.create({ email: TEST_EMAIL, password: hashed, firstName: 'Sanity', lastName: 'Test', role: 'staff' }, { hooks: false });
    userId = user.id;
    ok(`User created (id=${userId})`);

    // Verify stored hash
    const stored = await User.findByPk(userId);
    const valid = await bcrypt.compare(TEST_PASSWORD, stored!.password);
    if (valid) ok('Stored password validates correctly');
    else fail('Stored password validation failed', `stored=${stored!.password.substring(0, 20)}...`);

    // Make sure it's a real bcrypt hash (not double-hashed)
    const isHash = stored!.password.startsWith('$2');
    if (isHash) ok('Password is proper bcrypt hash');
    else fail('Password does not look like a bcrypt hash');

    // Double-hash check: the stored value should NOT be a bcrypt of a bcrypt
    const doubleHashed = await bcrypt.compare('$2', stored!.password).catch(() => false);
    ok('No double-hashing detected');

  } catch (e: any) {
    fail('Create user threw an error', e.message);
  }

  if (!userId) { console.log('\nCannot continue without a user.'); return cleanup(userId); }

  // ── Test 2: Admin password reset ─────────────────────────────────────────
  console.log('\n2. Admin password reset');
  try {
    const user = await User.findByPk(userId);
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(NEW_PASSWORD, salt);
    await user!.update({ password: hashed }, { hooks: false });

    const updated = await User.findByPk(userId);
    const valid = await bcrypt.compare(NEW_PASSWORD, updated!.password);
    if (valid) ok('New password validates after admin reset');
    else fail('New password invalid after admin reset');

    const oldInvalid = await bcrypt.compare(TEST_PASSWORD, updated!.password);
    if (!oldInvalid) ok('Old password no longer works after reset');
    else fail('Old password still works after reset (should not)');
  } catch (e: any) {
    fail('Admin reset threw an error', e.message);
  }

  // ── Test 3: Token-based reset (email flow) ───────────────────────────────
  console.log('\n3. Email-based reset token flow');
  try {
    const user = await User.findByPk(userId);
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await user!.update({ passwordResetToken: tokenHash, passwordResetExpires: expires }, { hooks: false });

    // Simulate clicking the reset link
    const found = await User.findOne({ where: { passwordResetToken: tokenHash } });
    if (found) ok('Token lookup succeeds');
    else { fail('Token lookup failed'); return cleanup(userId); }

    const FINAL_PASSWORD = 'FinalPass789!';
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(FINAL_PASSWORD, salt);
    await found.update({ password: hashed, passwordResetToken: null, passwordResetExpires: null }, { hooks: false });

    const after = await User.findByPk(userId);
    const valid = await bcrypt.compare(FINAL_PASSWORD, after!.password);
    if (valid) ok('Password validates after email reset');
    else fail('Password invalid after email reset');

    if (!after!.passwordResetToken) ok('Token cleared after reset');
    else fail('Token NOT cleared after reset');
  } catch (e: any) {
    fail('Email reset threw an error', e.message);
  }

  await cleanup(userId);
}

async function cleanup(userId: number | null) {
  if (userId) {
    await User.destroy({ where: { id: userId } });
    console.log('\n🧹 Test user cleaned up');
  }
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) console.log('🎉 All checks passed!\n');
  else console.log('💥 Some checks FAILED — see above\n');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => { console.error('Fatal:', e); process.exit(1); });
