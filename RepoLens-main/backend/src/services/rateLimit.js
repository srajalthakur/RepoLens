const { sleep } = require('../lib/sleep');
const { emitToJob } = require('../lib/socket');
const { RATE_LIMIT_THRESHOLD } = require('../lib/constants');

/**
 * Checks GitHub rate limit after every Octokit call.
 * If remaining < 50, pauses execution until reset.
 */
async function checkRateLimit(octokit, jobId = null) {
  try {
    const rateLimit = await octokit.rateLimit.get();
    const remaining = rateLimit.data.rate.remaining;
    const resetTime = rateLimit.data.rate.reset;

    console.log(`GitHub rate limit: ${remaining} remaining`);

    if (remaining < RATE_LIMIT_THRESHOLD) {
      const waitMs = (resetTime * 1000) - Date.now() + 5000;
      const waitSeconds = Math.ceil(waitMs / 1000);

      console.log(`⚠️  Rate limit low. Pausing ${waitSeconds}s.`);

      if (jobId) {
        emitToJob(jobId, 'job:rateLimit', {
          message: `GitHub API rate limit reached. Pausing ingestion and resuming in ${waitSeconds} seconds...`,
          resumeIn: waitSeconds,
        });
      }

      await sleep(waitMs);
      console.log('✅ Resuming after rate limit reset.');
    }
  } catch (err) {
    console.error('Rate limit check failed:', err.message);
  }
}

module.exports = { checkRateLimit };