/**
 * @file include/CloneFactoryReverseEngineer.ts
 * @description Reverse engineering and dependency locking engine for cloned repositories.
 */

import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface ReverseEngineeringReport {
  detectedLanguage: string;
  packageManager: string;
  entryPoint: string;
  dependencyHash: string;
  requiresHardenedDocker: boolean;
}

export class CloneFactoryReverseEngineer {
  public static analyze(repoPath: string): ReverseEngineeringReport {
    let lang = 'TypeScript/JavaScript';
    let pm = 'npm';
    let entry = 'index.ts';

    if (fs.existsSync(path.join(repoPath, 'Cargo.toml'))) {
      lang = 'Rust';
      pm = 'cargo';
      entry = 'src/main.rs';
    } else if (fs.existsSync(path.join(repoPath, 'go.mod'))) {
      lang = 'Go';
      pm = 'go';
      entry = 'main.go';
    }

    const lockFile = fs.existsSync(path.join(repoPath, 'package-lock.json')) ? 'package-lock.json' : 'none';
    const dependencyHash = createHash('sha256').update(lockFile).digest('hex');

    return {
      detectedLanguage: lang,
      packageManager: pm,
      entryPoint: entry,
      dependencyHash,
      requiresHardenedDocker: true,
    };
  }
}
