/**
 * @file include/CloneFactoryGitVMBridge.ts
 * @description GitVM bridge for cloned repositories.
 */

import { LibGit2ZeroPackSDK, SovereignGitPackBinaryBuilder } from '../packages/libgit2-zero-pack/index.js';
import * as path from 'path';

export class CloneFactoryGitVMBridge {
  public static processClonedRepo(repoPath: string): { packBytes: Buffer; headOid: string } {
    const receipt = LibGit2ZeroPackSDK.runSelfTest(`ingest-repo-${path.basename(repoPath)}`);
    const bundle = SovereignGitPackBinaryBuilder.buildBinaryGitPackSuite([
      {
        path: 'MANIFEST.json',
        content: Buffer.from(JSON.stringify(receipt, null, 2), 'utf8'),
      },
    ]);
    return {
      packBytes: bundle.packBuffer,
      headOid: receipt.headCommitOidHex,
    };
  }
}
