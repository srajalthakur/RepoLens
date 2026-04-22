/**
 * Run this to test ingestion on real repos:
 * node test-ingestion.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { ingestRepo } = require('./src/services/ingestion');

const prisma = new PrismaClient();

// Test with a small, well-known public repo
const TEST_REPO = 'https://github.com/expressjs/express';

// Testing with a large repo
// const TEST_REPO = 'https://github.com/vercel/next.js';

async function main() {
  console.log('🔍 Testing ingestion pipeline...\n');
  console.log(`Repo: ${TEST_REPO}\n`);

  // Get a real user access token from DB to test with
  const user = await prisma.user.findFirst();

  if (!user) {
    console.error('❌ No users in database. Log in to the app first, then run this script.');
    process.exit(1);
  }

  console.log(`Using token for: ${user.username}\n`);

  try {
    const result = await ingestRepo(TEST_REPO, user.accessToken);

    console.log('✅ Ingestion complete!\n');
    console.log('── Summary ──────────────────────────────');
    console.log(`Repo:         ${result.repoName}`);
    console.log(`Size:         ${result.sizeMB} MB`);
    console.log(`Total files:  ${result.totalFiles}`);
    console.log(`Tier 1 files: ${Object.keys(result.tier1).length}`);
    console.log(`Tier 2 files: ${Object.keys(result.tier2).length}`);
    console.log(`Tier 3 paths: ${result.tier3Paths.length}`);
    console.log('─────────────────────────────────────────\n');

    console.log('Tier 1 files fetched:');
    Object.keys(result.tier1).forEach((p) => {
      const preview = result.tier1[p].slice(0, 60).replace(/\n/g, ' ');
      console.log(`  ✅ ${p} — "${preview}..."`);
    });

    console.log('\nTier 2 files fetched:');
    Object.keys(result.tier2).forEach((p) => {
      console.log(`  ✅ ${p}`);
    });

  } catch (err) {
    console.error('❌ Ingestion failed:', err.message);
  }

  await prisma.$disconnect();
}

main();