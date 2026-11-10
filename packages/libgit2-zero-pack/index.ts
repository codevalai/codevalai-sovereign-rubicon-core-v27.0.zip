/**
 * @package @codevalai/libgit2-zero-pack
 * @version 28.0.0
 * @description Bare-Metal Git Packfile v2 (PACK), Fanout Index v2 (\xFFtOc), Multi-Pack-Index (MIDX),
 * Reachability Bitmap (BITM + 32-Bit SWAR XOR/AND-NOT Diffing), and Branchless 12-Bit LUT Inflate.
 * Repository: https://github.com/codevalai/libgit2-zero-pack
 */

import {
  SovereignGitPackBinaryBuilder,
  type GitBinaryArtifactsBundle,
} from '../../src/server/SovereignGitPackBinaryBuilder.js';
import { SovereignBitmapDiff } from '../../include/SovereignBitmapDiff.js';
import { SovereignMIDXHypergrid } from '../../include/SovereignMIDXHypergrid.js';
import { SovereignCXLStore } from '../../include/SovereignCXLStore.js';
import {
  branchlessLutZeroCopyInflate,
  unrolledBitmapXorDiff320,
} from '../../src/server/SovereignZenithV25Core.js';
import { SovereignBiniusLutFolder } from '../../src/server/SovereignOmegaOrchestratorV26.js';

export {
  SovereignGitPackBinaryBuilder,
  type GitBinaryArtifactsBundle,
  SovereignBitmapDiff,
  SovereignMIDXHypergrid,
  SovereignCXLStore,
  branchlessLutZeroCopyInflate,
  unrolledBitmapXorDiff320,
  SovereignBiniusLutFolder,
};

export interface LibGit2ZeroPackSelfTestResult {
  packageName: '@codevalai/libgit2-zero-pack';
  packMagicHex: string;
  idxMagicHex: string;
  midxMagicHex: string;
  bitmapMagicHex: string;
  packByteLength: number;
  headCommitOidHex: string;
  lutRoundtripVerified: boolean;
  lutCompressionRatio: number;
  bitmapXorPopcount: number;
  executionLatencyUs: number;
}

export class LibGit2ZeroPackSDK {
  public static runSelfTest(
    customCommitMsg: string = 'feat(zero-pack): bare-metal GitVM packfile v2'
  ): LibGit2ZeroPackSelfTestResult {
    const t0 = performance.now();
    const sampleFiles = [
      {
        path: 'README.md',
        content: Buffer.from(`# @codevalai/libgit2-zero-pack\n${customCommitMsg}\n`, 'utf8'),
      },
      {
        path: 'src/index.ts',
        content: Buffer.from(`export const COMMIT_MSG = ${JSON.stringify(customCommitMsg)};\n`, 'utf8'),
      },
    ];

    const bundle = SovereignGitPackBinaryBuilder.buildBinaryGitPackSuite(sampleFiles);

    const rawHeader =
      `tree ${bundle.receipt.rootTreeOidHex}\n` +
      `author sovereign-rubicon-core <root@sovereign.lattice>\n` +
      `committer sovereign-rubicon-core <root@sovereign.lattice>\n` +
      `gpgsig -----BEGIN ML-DSA-65 SIGNATURE-----\n` +
      `${customCommitMsg}\n` +
      `-----END ML-DSA-65 SIGNATURE-----\n`;

    const lutRes = SovereignBiniusLutFolder.compressAndInflateGitHeader(rawHeader);

    const maskA = new Uint32Array(320);
    const maskB = new Uint32Array(320);
    const xorOut = new Uint32Array(320);
    for (let i = 0; i < 320; i++) {
      maskA[i] = (0x9e3779b9 ^ (i * 0x85ebca6b)) >>> 0;
      maskB[i] = (0x9e3779b9 ^ ((i + 3) * 0xc2b2ae35)) >>> 0;
    }
    const popcnt = unrolledBitmapXorDiff320(maskA, maskB, xorOut);

    return {
      packageName: '@codevalai/libgit2-zero-pack',
      packMagicHex: bundle.receipt.packMagicHex,
      idxMagicHex: bundle.receipt.idxMagicHex,
      midxMagicHex: bundle.receipt.midxMagicHex,
      bitmapMagicHex: bundle.receipt.bitmapMagicHex,
      packByteLength: bundle.receipt.packByteLength,
      headCommitOidHex: bundle.receipt.headCommitOidHex,
      lutRoundtripVerified: lutRes.roundtripVerified,
      lutCompressionRatio: Number(
        (lutRes.inflatedBytes / Math.max(1, lutRes.compressedBytes)).toFixed(2)
      ),
      bitmapXorPopcount: popcnt,
      executionLatencyUs: Number(((performance.now() - t0) * 1000).toFixed(2)),
    };
  }
}
