/**
 * @file scripts/clone-factory-ingest.ts
 * @description Ingestion script for targeted GitHub repositories.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface RepositoryTarget {
  owner: string;
  repo: string;
  cloneUrl: string;
  defaultBranch: string;
}

export class SovereignCloneFactoryIngestor {
  public static async ingestAndClone(target: RepositoryTarget): Promise<string> {
    const workDir = path.join(process.cwd(), '.workdir', target.owner, target.repo);
    if (fs.existsSync(workDir)) {
      execSync(`git -C ${workDir} pull --ff-only`, { stdio: 'inherit' });
    } else {
      fs.mkdirSync(workDir, { recursive: true });
      execSync(`git clone --depth 1 --branch ${target.defaultBranch} ${target.cloneUrl} ${workDir}`, { stdio: 'inherit' });
    }
    return workDir;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const targetArg = process.argv.indexOf('--target');
  const repoSlug = targetArg !== -1 && process.argv[targetArg + 1] ? process.argv[targetArg + 1] : 'codevalai/sovereign-rubicon-core';
  const [owner, repo] = repoSlug.split('/');
  console.log(`[+] Ingesting target repository: ${owner}/${repo}`);
  SovereignCloneFactoryIngestor.ingestAndClone({
    owner,
    repo,
    cloneUrl: `https://github.com/${owner}/${repo}.git`,
    defaultBranch: 'main',
  }).then((dir) => {
    console.log(`[+] Cloned successfully to: ${dir}`);
  }).catch((err) => {
    console.error(`[-] Ingestion failed:`, err);
    process.exit(1);
  });
}
