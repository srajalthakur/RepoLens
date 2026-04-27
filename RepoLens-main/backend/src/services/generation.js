const PQueue = require('p-queue').default;
const { PrismaClient } = require('@prisma/client');
const { callClaudeWithRetry } = require('../lib/anthropic');
const { ingestRepo } = require('./ingestion');
const { getCachedRepo, setCachedRepo } = require('./cache');
const { emitToJob } = require('../lib/socket');
const { CLAUDE_CONCURRENCY, MAX_DOC_FAILURES } = require('../lib/constants');
const {
  overviewPrompt,
  specPrompt,
  architecturePrompt,
  techStackPrompt,
  databasePrompt,
  apiPrompt,
  setupPrompt,
  deploymentPrompt,
} = require('./prompts');

const prisma = new PrismaClient();

// Maps each DocumentType to its prompt builder function
function buildPrompts(ingested) {
  const { tier1, tier2 } = ingested;

  return [
    { type: 'OVERVIEW',      prompt: overviewPrompt(tier1) },
    { type: 'SPEC',          prompt: specPrompt(tier1) },
    { type: 'ARCHITECTURE',  prompt: architecturePrompt(tier1, tier2) },
    { type: 'TECHSTACK',     prompt: techStackPrompt(tier1) },
    { type: 'DATABASE',      prompt: databasePrompt(tier1, tier2) },
    { type: 'API',           prompt: apiPrompt(tier2) },
    { type: 'SETUP',         prompt: setupPrompt(tier1) },
    { type: 'DEPLOYMENT',    prompt: deploymentPrompt(tier1, tier2) },
  ];
}

/**
 * Full pipeline: ingest → generate → save → cache → notify.
 * Runs asynchronously after the job is created.
 * Never throws — all errors are handled internally.
 */
async function processJob(jobId, repoUrl, accessToken) {
  console.log(`\n🚀 Starting job ${jobId} for ${repoUrl}`);

  try {
    // ── Step 1: Ingest the repo ──────────────────────────────────────────────
    let ingested;
    try {
      ingested = await ingestRepo(repoUrl, accessToken, null, jobId);
    } catch (err) {
      const message =
        err.message === 'REPO_TOO_LARGE'
          ? 'This repository is too large for free tier analysis. RepoLens works best with repos under 50MB and 2,000 files.'
          : err.message === 'REPO_NOT_FOUND'
          ? 'Repository not found. Make sure the URL is correct and the repo is public.'
          : err.message.includes('rate limit') || err.message.includes('403')
          ? 'GitHub API rate limit reached. Please wait a few minutes and try again.'
          : `Ingestion failed: ${err.message}`;

      await prisma.job.update({
        where: { id: jobId },
        data: { status: 'FAILED', error: message },
      });

      emitToJob(jobId, 'job:error', { message });
      return;
    }

    emitToJob(jobId, 'job:status', {
      status: 'PROCESSING',
      message: `Ingestion complete. Generating ${8} documents in parallel...`,
    });

    // ── Step 2: Build all 8 prompts ──────────────────────────────────────────
    const promptTasks = buildPrompts(ingested);

    // ── Step 3: Run generation with p-queue (max 3 concurrent Claude calls) ──
    const queue = new PQueue({ concurrency: CLAUDE_CONCURRENCY });

    let failureCount = 0;
    const generatedDocs = [];

    const tasks = promptTasks.map(({ type, prompt }) =>
      queue.add(async () => {
        console.log(`  Generating ${type}...`);

        let content;
        try {
          content = await callClaudeWithRetry(prompt);
          console.log(`  ✅ ${type} done (${content.length} chars)`);
        } catch (err) {
          failureCount++;

          // Detect specific error types for better logging
          const isTokenLimit = err.message?.includes('too long') ||
            err.message?.includes('max_tokens') ||
            err.message?.includes('token')
          const isBilling = err.message?.includes('credit balance')

          if (isBilling) {
            console.error(`  ❌ ${type} failed: Anthropic billing issue`)
          } else if (isTokenLimit) {
            console.error(`  ❌ ${type} failed: prompt too large (token limit)`)
          } else {
            console.error(`  ❌ ${type} failed:`, err.message)
          }

          content = '[Generation failed for this document. Try regenerating.]'
        }

        // Save document to DB immediately
        await prisma.document.create({
          data: { type, content, jobId },
        });

        generatedDocs.push({ type, content });

        // Notify frontend this doc is ready
        emitToJob(jobId, 'job:docComplete', { type, content });

        // If too many failures, abort remaining queue items
        if (failureCount > MAX_DOC_FAILURES) {
          queue.clear();
          throw new Error('TOO_MANY_FAILURES');
        }
      })
    );

    // Wait for all tasks to finish (or abort on too many failures)
    try {
      await Promise.all(tasks);
    } catch (err) {
      if (err.message === 'TOO_MANY_FAILURES') {
        const message = 'Documentation generation failed. Please try again.';

        await prisma.job.update({
          where: { id: jobId },
          data: { status: 'FAILED', error: message },
        });

        emitToJob(jobId, 'job:error', { message });
        return;
      }
      throw err;
    }

    // ── Step 4: Mark job as done ─────────────────────────────────────────────
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'DONE' },
    });

    // ── Step 5: Write to cache ───────────────────────────────────────────────
    try {
      await setCachedRepo(repoUrl, generatedDocs);
    } catch (err) {
      // Cache write failure is non-fatal
      console.error('Cache write failed (non-fatal):', err.message);
    }

    // ── Step 6: Notify frontend ──────────────────────────────────────────────
    if (failureCount > 0) {
      emitToJob(jobId, 'job:status', {
        status: 'DONE',
        message: 'Some documents could not be generated. You can try regenerating below.',
      });
    }

    emitToJob(jobId, 'job:done', { jobId });

    console.log(`✅ Job ${jobId} complete. ${generatedDocs.length} docs generated, ${failureCount} failures.\n`);

  } catch (err) {
    console.error(`❌ Job ${jobId} crashed:`, err.message);

    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'FAILED', error: err.message },
    }).catch(() => {});

    emitToJob(jobId, 'job:error', {
      message: 'Documentation generation failed. Please try again.',
    });
  }
}

module.exports = { processJob };