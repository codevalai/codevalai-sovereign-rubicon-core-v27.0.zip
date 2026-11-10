/**
 * @file include/CloneFactoryStaticAnalyzer.ts
 * @description Static analysis engine for cloned repositories.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface StaticAnalysisReport {
  language: string;
  framework: string;
  entryPoint: string;
  buildSystem: string;
  securityFlags: string[];
}

export class CloneFactoryStaticAnalyzer {
  public static analyzeRepo(repoPath: string): StaticAnalysisReport {
    let language = 'Unknown';
    let framework = 'Generic';
    let entryPoint = 'main';
    let buildSystem = 'make';
    const securityFlags: string[] = ['non-root-user', 'read-only-rootfs'];

    if (fs.existsSync(path.join(repoPath, 'Cargo.toml'))) {
      language = 'Rust';
      buildSystem = 'cargo';
      entryPoint = 'src/main.rs';
    } else if (fs.existsSync(path.join(repoPath, 'package.json'))) {
      language = 'TypeScript/JavaScript';
      buildSystem = 'npm';
      entryPoint = 'index.ts';
    } else if (fs.existsSync(path.join(repoPath, 'go.mod'))) {
      language = 'Go';
      buildSystem = 'go build';
      entryPoint = 'main.go';
    }

    return { language, framework, entryPoint, buildSystem, securityFlags };
  }
}
