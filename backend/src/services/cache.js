const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { CACHE_TTL_HOURS } = require('../lib/constants');

const prisma = new PrismaClient();

// Converts a repo URL into a consistent hash used as the cache key
function getRepoHash(repoUrl) {
  return crypto
    .createHash('sha256')
    .update(repoUrl.toLowerCase().trim())
    .digest('hex');
}

// Returns cached documents if they exist and are still fresh, otherwise null
async function getCachedRepo(repoUrl) {
  const repoHash = getRepoHash(repoUrl);

  const cached = await prisma.repoCache.findUnique({
    where: { repoHash },
    include: { documents: true },
  });

  if (!cached) return null;

  const ageMs = Date.now() - cached.lastGenerated.getTime();
  const ttlMs = CACHE_TTL_HOURS * 60 * 60 * 1000;
  const isFresh = ageMs < ttlMs;

  if (!isFresh) {
    console.log(`Cache expired for ${repoUrl} — will regenerate`);
    return null;
  }

  console.log(`✅ Cache hit for ${repoUrl}`);
  return cached;
}

// Saves generated documents to the cache (upsert — overwrite if exists)
async function setCachedRepo(repoUrl, documents) {
  const repoHash = getRepoHash(repoUrl);

  // Delete old cache entry if it exists so we can recreate cleanly
  await prisma.repoCache.deleteMany({ where: { repoHash } });

  await prisma.repoCache.create({
    data: {
      repoHash,
      repoUrl,
      lastGenerated: new Date(),
      documents: {
        create: documents.map((doc) => ({
          type: doc.type,
          content: doc.content,
        })),
      },
    },
  });

  console.log(`✅ Cached ${documents.length} documents for ${repoUrl}`);
}

module.exports = { getCachedRepo, setCachedRepo, getRepoHash };