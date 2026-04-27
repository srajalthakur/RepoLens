const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { createOctokit } = require('../lib/octokit');

const prisma = new PrismaClient();

// GET /auth/github — redirect to GitHub
router.get('/github', (req, res) => {
  const redirectUri = process.env.FRONTEND_URL
    ? `${process.env.FRONTEND_URL}/auth/github/callback`
    : "https://repo-lens-psi.vercel.app/auth/github/callback";

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'read:user',
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// GET /auth/github/callback
router.get('/github/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
  }

  const redirectUri = process.env.FRONTEND_URL
    ? `${process.env.FRONTEND_URL}/auth/github/callback`
    : "https://repo-lens-psi.vercel.app/auth/github/callback";

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('GitHub token error:', tokenData.error);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=token_failed`);
    }

    const accessToken = tokenData.access_token;
    const octokit = createOctokit(accessToken);
    const { data: githubUser } = await octokit.users.getAuthenticated();

    const user = await prisma.user.upsert({
      where: { githubId: String(githubUser.id) },
      update: {
        username: githubUser.login,
        avatarUrl: githubUser.avatar_url,
        accessToken,
      },
      create: {
        githubId: String(githubUser.id),
        username: githubUser.login,
        avatarUrl: githubUser.avatar_url,
        accessToken,
      },
    });

    req.session.userId = user.id;
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=session_failed`);
      }
      console.log('✅ Session saved for user:', user.username);
      res.redirect(`${process.env.FRONTEND_URL}/`);
    });

  } catch (err) {
    console.error('Auth callback error:', err);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
});

// GET /auth/me
router.get('/me', async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ user: null });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ user: null });
    }

    res.json({ user });
  } catch (err) {
    console.error('Auth me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /auth/logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out successfully' });
  });
});

module.exports = router;
