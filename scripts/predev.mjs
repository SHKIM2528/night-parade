import { spawnSync } from 'node:child_process';

const git = (args, capture = false) => spawnSync('git', args, {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  windowsHide: true,
});

function readGit(args) {
  const result = git(args, true);
  return {
    ok: result.status === 0,
    value: result.stdout?.trim() ?? '',
  };
}

const repository = readGit(['rev-parse', '--is-inside-work-tree']);
if (!repository.ok || repository.value !== 'true') {
  console.warn('[predev] Not inside a Git worktree; skipping the main update.');
  process.exit(0);
}

const currentBranch = readGit(['branch', '--show-current']);
if (!currentBranch.ok || !currentBranch.value) {
  console.warn('[predev] Detached HEAD detected; skipping the main update.');
  process.exit(0);
}

if (currentBranch.value !== 'main') {
  console.log(`[predev] On ${currentBranch.value}; fetching origin/main without merging it into this branch.`);
  const fetch = git(['fetch', 'origin', 'main']);
  if (fetch.status !== 0) {
    console.error('[predev] Could not refresh origin/main. Dev server was not started.');
    process.exit(fetch.status || 1);
  }
  process.exit(0);
}

const worktree = readGit(['status', '--porcelain']);
if (!worktree.ok) {
  console.error('[predev] Could not inspect the worktree. Dev server was not started.');
  process.exit(1);
}

if (worktree.value) {
  console.warn('[predev] main has uncommitted changes; skipping pull to protect local work.');
  process.exit(0);
}

console.log('[predev] Updating main with a fast-forward-only pull.');
const pull = git(['pull', '--ff-only', 'origin', 'main']);
if (pull.status !== 0) {
  console.error('[predev] main could not be fast-forwarded. Dev server was not started.');
  process.exit(pull.status || 1);
}
