const { Octokit } = require('@octokit/rest');

// Creates an authenticated Octokit instance for a given user access token
function createOctokit(accessToken) {
  return new Octokit({
    auth: accessToken,
  });
}

module.exports = { createOctokit };