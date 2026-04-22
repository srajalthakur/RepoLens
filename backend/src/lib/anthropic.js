const Anthropic = require('@anthropic-ai/sdk');
const { sleep } = require('./sleep');
const { CLAUDE_MAX_RETRIES } = require('./constants');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Errors that will never succeed on retry — fail immediately
function isUnretryable(err) {
  const msg = err.message || ''
  return (
    msg.includes('credit balance') ||
    msg.includes('invalid_api_key') ||
    msg.includes('permission') ||
    (err.status === 400 && msg.includes('invalid_request'))
  )
}

async function callClaudeWithRetry(prompt, maxRetries = CLAUDE_MAX_RETRIES) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });

      return response.content[0].text;
    } catch (err) {
      lastError = err;

      // Don't retry errors that will never succeed
      if (isUnretryable(err)) {
        console.error(`Claude unretryable error:`, err.message);
        throw err;
      }

      console.error(`Claude attempt ${attempt}/${maxRetries} failed:`, err.message);

      if (attempt < maxRetries) {
        const backoff = attempt * 2000;
        console.log(`Retrying in ${backoff / 1000}s...`);
        await sleep(backoff);
      }
    }
  }

  throw lastError;
}

module.exports = { callClaudeWithRetry };