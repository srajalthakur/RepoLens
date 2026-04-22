/**
 * Each function takes the relevant file contents and returns
 * a complete prompt string ready to send to Claude.
 * Files are passed as an object: { "path": "content", ... }
 */

function formatFiles(filesObj) {
  if (!filesObj || Object.keys(filesObj).length === 0) {
    return '(No files available)';
  }

  // Hard limit: max 20 files per prompt, 4000 chars per file
  // This prevents token limit errors on large repos
  const entries = Object.entries(filesObj).slice(0, 20);

  return entries
    .map(([path, content]) => {
      const truncated = content.length > 4000
        ? content.slice(0, 4000) + '\n\n[...file truncated...]'
        : content;
      return `### File: ${path}\n\`\`\`\n${truncated}\n\`\`\``;
    })
    .join('\n\n');
}
  
  function formatPathList(paths) {
    if (!paths || paths.length === 0) return '(none)';
    return paths.map((p) => `- ${p}`).join('\n');
  }
  
  // ── Prompt 1: Project Overview ───────────────────────────────────────────────
  function overviewPrompt(tier1Files) {
    return `You are a technical documentation expert. Given the following repository files, generate a Project Overview document in Markdown.
  
  Include:
  - Project name and one-line description
  - What problem it solves and who it's for
  - Key features (bullet list)
  - High-level how it works (2-3 paragraphs)
  - Project status / maturity notes if inferrable
  
  Files provided:
  ${formatFiles(tier1Files)}
  
  Respond only in clean Markdown.`;
  }
  
  // ── Prompt 2: Reverse Engineer Spec ─────────────────────────────────────────
  function specPrompt(tier1Files) {
    return `You are a senior product engineer. Given these repository files, reverse-engineer what the original product requirements must have been.
  
  Generate:
  - Original problem statement (as if written before development)
  - User stories (5-10, in "As a [user] I want [action] so that [value]" format)
  - Functional requirements list
  - Non-functional requirements (performance, security, scalability hints)
  - A complete AI rebuild prompt — a single detailed paragraph that, if pasted into an AI coding assistant, would recreate this project
  
  Files provided:
  ${formatFiles(tier1Files)}
  
  Respond only in clean Markdown.`;
  }
  
  // ── Prompt 3: System Architecture ───────────────────────────────────────────
  function architecturePrompt(tier1Files, tier2Files) {
    // Pull out entry points, docker, config files
    const relevantFiles = {};
    const allFiles = { ...tier1Files, ...tier2Files };
  
    Object.entries(allFiles).forEach(([path, content]) => {
      const isRelevant = [
        'index', 'main', 'app', 'server', 'docker', 'compose', 'config'
      ].some((k) => path.toLowerCase().includes(k));
      if (isRelevant) relevantFiles[path] = content;
    });
  
    // Fall back to all tier1 if nothing matched
    const filesToUse = Object.keys(relevantFiles).length > 0 ? relevantFiles : tier1Files;
  
    return `You are a solutions architect. Given these files, generate a System Architecture document.
  
  Include:
  - Architecture overview (2 paragraphs)
  - Component diagram as a valid Mermaid flowchart (graph TD)
  - Data flow description
  - Key architectural decisions and patterns used
  
  IMPORTANT: The Mermaid diagram must be valid and renderable. Use only supported Mermaid flowchart syntax inside a \`\`\`mermaid code block. Keep node labels short and avoid special characters inside node labels.
  
  Files provided:
  ${formatFiles(filesToUse)}
  
  Respond only in clean Markdown.`;
  }
  
  // ── Prompt 4: Tech Stack ─────────────────────────────────────────────────────
  function techStackPrompt(tier1Files) {
    // Pull out dependency/manifest files
    const manifestFiles = {};
    Object.entries(tier1Files).forEach(([path, content]) => {
      const isManifest = [
        'package.json', 'requirements.txt', 'go.mod', 'cargo.toml',
        'gemfile', 'pom.xml', 'build.gradle', 'pyproject.toml'
      ].some((k) => path.toLowerCase().includes(k));
      if (isManifest) manifestFiles[path] = content;
    });
  
    const filesToUse = Object.keys(manifestFiles).length > 0 ? manifestFiles : tier1Files;
  
    return `You are a technical writer. Given these dependency and config files, generate a Tech Stack document.
  
  For each technology found:
  - Name and version
  - What role it plays in the project
  - Why it was likely chosen (one sentence)
  
  Group by: Frontend / Backend / Database / DevOps / Testing
  
  If a category has no technologies, omit it.
  
  Files provided:
  ${formatFiles(filesToUse)}
  
  Respond only in clean Markdown.`;
  }
  
  // ── Prompt 5: Database Schema ────────────────────────────────────────────────
  function databasePrompt(tier1Files, tier2Files) {
    const schemaFiles = {};
    const allFiles = { ...tier1Files, ...tier2Files };
  
    Object.entries(allFiles).forEach(([path, content]) => {
      const isSchema = [
        'schema', 'migration', 'model', 'entity', 'prisma', '.sql'
      ].some((k) => path.toLowerCase().includes(k));
      if (isSchema) schemaFiles[path] = content;
    });
  
    const filesToUse = Object.keys(schemaFiles).length > 0 ? schemaFiles : {};
  
    return `You are a database architect. Given these schema and migration files, generate a Database Schema document.
  
  Include:
  - Overview of the data model
  - Each table/collection: columns, types, constraints, purpose
  - An ER diagram as valid Mermaid erDiagram syntax inside a \`\`\`mermaid code block
  - Key relationships explained in plain English
  
  If no DB files are found, say "No database schema files were detected in this repository." and provide a brief note on what was inferred from the codebase.
  
  IMPORTANT: The Mermaid erDiagram must use valid syntax. Relationship types: ||--||, ||--o{, }o--o{. Attribute types must be simple words like string, int, boolean, datetime.
  
  Files provided:
  ${Object.keys(filesToUse).length > 0 ? formatFiles(filesToUse) : '(No schema files detected)'}
  
  Respond only in clean Markdown.`;
  }
  
  // ── Prompt 6: API Reference ──────────────────────────────────────────────────
  function apiPrompt(tier2Files) {
    const apiFiles = {};
  
    Object.entries(tier2Files).forEach(([path, content]) => {
      const isApi = [
        'route', 'controller', 'handler', 'api', 'endpoint'
      ].some((k) => path.toLowerCase().includes(k));
      if (isApi) apiFiles[path] = content;
    });
  
    const filesToUse = Object.keys(apiFiles).length > 0 ? apiFiles : tier2Files;
  
    return `You are an API documentation expert. Given these route and controller files, generate an API Reference document.
  
  For each endpoint found:
  - Method + path (e.g. POST /api/users)
  - Description
  - Request params/body (if inferrable)
  - Response format (if inferrable)
  - Auth required (yes/no)
  
  Group by resource/domain.
  
  If no API files found, say "No API routes were detected in this repository."
  
  Files provided:
  ${formatFiles(filesToUse)}
  
  Respond only in clean Markdown.`;
  }
  
  // ── Prompt 7: Developer Setup Guide ─────────────────────────────────────────
  function setupPrompt(tier1Files) {
    return `You are a developer experience engineer. Given these files, write a complete step-by-step Developer Setup Guide for a new developer joining this project.
  
  Include:
  - Prerequisites (Node version, Python version, runtime requirements, etc.)
  - Step 1: Clone the repo
  - Step 2: Install dependencies (exact commands)
  - Step 3: Environment variables (list every .env variable with descriptions)
  - Step 4: Database setup (if applicable)
  - Step 5: Run in development mode
  - Step 6: Run tests (if test files exist)
  - Common issues and fixes (infer from config)
  
  Files provided:
  ${formatFiles(tier1Files)}
  
  Respond only in clean Markdown.`;
  }
  
  // ── Prompt 8: Deployment Guide ───────────────────────────────────────────────
  function deploymentPrompt(tier1Files, tier2Files) {
    const deployFiles = {};
    const allFiles = { ...tier1Files, ...tier2Files };
  
    Object.entries(allFiles).forEach(([path, content]) => {
      const isDeploy = [
        'dockerfile', 'docker-compose', 'vercel', 'render', 'railway',
        'heroku', 'fly.toml', 'netlify', '.github/workflows'
      ].some((k) => path.toLowerCase().includes(k));
      if (isDeploy) deployFiles[path] = content;
    });
  
    // Always include package.json if available
    Object.entries(tier1Files).forEach(([path, content]) => {
      if (path.includes('package.json')) deployFiles[path] = content;
    });
  
    const filesToUse = Object.keys(deployFiles).length > 0 ? deployFiles : tier1Files;
  
    return `You are a DevOps engineer. Given these configuration files, write a Deployment Guide.
  
  Include:
  - Supported deployment targets (infer from Dockerfile, Vercel config, etc.)
  - Environment variables required for production
  - Step-by-step deployment instructions for the most likely platform
  - Build commands
  - Health check / verify deployment steps
  - Scaling considerations (if inferrable)
  
  If no deployment config found, provide a generic guide based on the detected tech stack.
  
  Files provided:
  ${formatFiles(filesToUse)}
  
  Respond only in clean Markdown.`;
  }
  
  module.exports = {
    overviewPrompt,
    specPrompt,
    architecturePrompt,
    techStackPrompt,
    databasePrompt,
    apiPrompt,
    setupPrompt,
    deploymentPrompt,
  };