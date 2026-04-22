const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/auth');
const { getCachedRepo } = require('../services/cache');
const { parseRepoUrl } = require('../services/ingestion');
const { processJob } = require('../services/generation');
const { emitToJob } = require('../lib/socket');

const prisma = new PrismaClient();

// ── POST /api/jobs ───────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { repoUrl } = req.body;

  if (!repoUrl || typeof repoUrl !== 'string') {
    return res.status(400).json({ error: 'repoUrl is required' });
  }

  let parsed;
  try {
    parsed = parseRepoUrl(repoUrl);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const repoName     = `${parsed.owner}/${parsed.repo}`;
  const normalizedUrl = `https://github.com/${repoName}`;

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
    });
    if (!user) return res.status(401).json({ error: 'User not found' });

    // ── FIX: Check cache BEFORE creating the job and BEFORE responding ───────
    // Old code checked cache after res.json(), causing a race condition where
    // the frontend could call GET /api/jobs/:id before documents were written.
    // Now the job is fully populated BEFORE the response is sent.
    const cached = await getCachedRepo(normalizedUrl);

    if (cached) {
      // Create job already in DONE state
      const job = await prisma.job.create({
        data: {
          repoUrl: normalizedUrl,
          repoName,
          status: 'DONE',
          userId: user.id,
        },
      });

      // Write cached documents into the new job synchronously
      await prisma.document.createMany({
        data: cached.documents.map((doc) => ({
          type:    doc.type,
          content: doc.content,
          jobId:   job.id,
        })),
      });

      // Respond — by now GET /api/jobs/:id will return DONE + all documents
      res.json({ jobId: job.id, repoName, fromCache: true });

      // Also emit via socket (with a small delay to allow frontend to join room)
      // This is a safety net — the frontend should already see DONE from the REST call
      setTimeout(() => {
        emitToJob(job.id, 'job:cached', {
          message: 'Loaded from cache — docs ready instantly!',
          jobId:   job.id,
        });
        emitToJob(job.id, 'job:done', { jobId: job.id });
      }, 2500);

      console.log(`⚡ Served ${repoName} from cache (job ${job.id})`);
      return;
    }

    // ── No cache — create job as PENDING and start processing ────────────────
    const job = await prisma.job.create({
      data: {
        repoUrl: normalizedUrl,
        repoName,
        status: 'PENDING',
        userId: user.id,
      },
    });

    // Respond immediately so frontend can connect via socket
    res.json({ jobId: job.id, repoName });

    await prisma.job.update({
      where: { id: job.id },
      data:  { status: 'PROCESSING' },
    });

    emitToJob(job.id, 'job:status', {
      status:  'PROCESSING',
      message: 'Starting repository analysis...',
    });

    // Fire and forget — runs async, emits progress via WebSocket
    processJob(job.id, normalizedUrl, user.accessToken);

  } catch (err) {
    console.error('Job creation error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to create job' });
    }
  }
});

// ── GET /api/jobs ────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const jobs = await prisma.job.findMany({
      where:   { userId: req.session.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id:        true,
        repoUrl:   true,
        repoName:  true,
        status:    true,
        createdAt: true,
        error:     true,
        _count: { select: { documents: true } },
      },
    });

    res.json({ jobs });
  } catch (err) {
    console.error('Get jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// ── GET /api/jobs/:id ────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const job = await prisma.job.findUnique({
      where:   { id: req.params.id },
      include: {
        documents: {
          select: { id: true, type: true, content: true, createdAt: true },
        },
      },
    });

    if (!job)                           return res.status(404).json({ error: 'Job not found' });
    if (job.userId !== req.session.userId) return res.status(403).json({ error: 'Access denied' });

    res.json({ job });
  } catch (err) {
    console.error('Get job error:', err);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// ── DELETE /api/jobs ─────────────────────────────────────────────────────────
// Clears ALL jobs (and their documents) for the authenticated user.
// Used by the "Clear All History" button on the History page.
router.delete('/', requireAuth, async (req, res) => {
  try {
    // Find all job IDs belonging to this user
    const userJobs = await prisma.job.findMany({
      where:  { userId: req.session.userId },
      select: { id: true },
    });

    if (userJobs.length === 0) {
      return res.json({ message: 'No history to clear', cleared: 0 });
    }

    const jobIds = userJobs.map((j) => j.id);

    // Delete documents first (no cascade configured in schema)
    await prisma.document.deleteMany({
      where: { jobId: { in: jobIds } },
    });

    // Then delete the jobs
    const { count } = await prisma.job.deleteMany({
      where: { userId: req.session.userId },
    });

    console.log(`🗑️  Cleared ${count} jobs for user ${req.session.userId}`);
    res.json({ message: `Cleared ${count} jobs`, cleared: count });
  } catch (err) {
    console.error('Clear history error:', err);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

module.exports = router;
