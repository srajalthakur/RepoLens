module.exports = {
  // Raised from 2000 — tree fetch is 1 API call regardless of file count.
  // We only ever fetch content for Tier1+Tier2 (max 80 files) anyway.
  MAX_REPO_FILES: 10000,

  // Raised from 50MB — GitHub reports compressed size, actual content
  // we fetch is far less since we only grab 80 files max.
  MAX_REPO_SIZE_MB: 150,

  // These are the real Claude token limit guards — keep these conservative
  MAX_TIER1_FILES: 30,
  MAX_TIER2_FILES: 50,

  RATE_LIMIT_THRESHOLD: 50,
  CACHE_TTL_HOURS: 24,
  CLAUDE_MAX_RETRIES: 3,
  CLAUDE_CONCURRENCY: 3,
  MAX_DOC_FAILURES: 4,
};