/**
 * @file scripts/clone-factory-universal-ingest.ts
 * @description Universal autonomous ingestion mesh for GitHub repositories.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface IngestionTarget {
  owner: string;
  repo: string;
  cloneUrl: string;
  commitSha: string;
}

export class UniversalCloneFactoryIngestor {
  private static workdirRoot = path.join(process.cwd(), '.workdir_universal');

  public static async executeIngestion(target: IngestionTarget): Promise<string> {
    const repoSlug = `${target.owner}__${target.repo}`;
    const targetPath = path.join(this.workdirRoot, repoSlug);
    
    if (fs.existsSync(targetPath)) {
      execSync(`git -C ${targetPath} fetch origin && git -C ${targetPath} reset --hard origin/main`, { stdio: 'ignore' });
    } else {
      fs.mkdirSync(targetPath, { recursive: true });
      execSync(`git clone --depth 1 ${target.cloneUrl} ${targetPath}`, { stdio: 'ignore' });
    }
    
    return targetPath;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('[+] Initializing Universal Clone Factory Ingestion Mesh...');
  UniversalCloneFactoryIngestor.executeIngestion({
    owner: 'codevalai',
    repo: 'sovereign-rubicon-core',
    cloneUrl: 'https://github.com/codevalai/sovereign-rubicon-core.git',
    commitSha: 'HEAD',
  }).then((p) => {
    console.log(`[+] Universal ingestion completed. Target at: ${p}`);
  }).catch((err) => {
    console.error('[-] Universal ingestion failed:', err);
    process.exit(1);
  });
}
