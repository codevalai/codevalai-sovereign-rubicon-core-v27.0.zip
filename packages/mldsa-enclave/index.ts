/**
 * @package @codevalai/mldsa-enclave
 * @version 29.0.0
 * @repository https://github.com/codevalai/mldsa-enclave
 * @license Apache-2.0 WITH LLVM-exception
 * @description
 * Standalone OG GitHub Library for Post-Quantum NIST FIPS 204 ML-DSA-65 Hardware Enclave
 * Digital Signatures over the Cyclotomic Module-Lattice Ring R_q = Z_8380417[X]/(X^256 + 1),
 * Primitive 512-th Root of Unity zeta = 1753, and Native WebAssembly (0x0061736d) CXL 3.0 Atomics.
 */

import {
  MLDSA65_Q,
  MLDSA65_N,
  MLDSA65_ZETA,
  MLDSA65_GAMMA1,
  MLDSA65_BETA,
  SovereignMLDSA65Enclave,
  SovereignSingularityEngineV29,
} from '../../include/SovereignSingularityEngineV29.js';
import type {
  MLDSA65EnclaveSignatureReceipt,
  SingularityExecutionReceipt,
} from '../../include/SovereignSingularityEngineV29.js';

export {
  MLDSA65_Q,
  MLDSA65_N,
  MLDSA65_ZETA,
  MLDSA65_GAMMA1,
  MLDSA65_BETA,
  SovereignMLDSA65Enclave,
  SovereignSingularityEngineV29,
};
export type { MLDSA65EnclaveSignatureReceipt, SingularityExecutionReceipt };

export interface MLDSAEnclaveSelfTestReceipt {
  packageName: '@codevalai/mldsa-enclave';
  modulusQ: number;
  ringDegreeN: number;
  primitiveRootZeta: number;
  zetaOrderVerified: boolean;
  nttHomomorphismVerified: boolean;
  responseInfinityNorm: number;
  normBoundLimit: number;
  normBoundSatisfied: boolean;
  publicKeyRootHex: string;
  signatureDigestHex: string;
  verificationPassed: boolean;
  executionLatencyUs: number;
}

export class MLDSAEnclaveSDK {
  public static runSelfTest(message: string = 'FIPS-204-ML-DSA-65-SOVEREIGN-ANCHOR'): MLDSAEnclaveSelfTestReceipt {
    const payload = Buffer.from(message, 'utf8');
    const receipt = SovereignMLDSA65Enclave.signAndVerifyEnclave(payload);
    return {
      packageName: '@codevalai/mldsa-enclave',
      modulusQ: receipt.modulusQ,
      ringDegreeN: receipt.ringDegreeN,
      primitiveRootZeta: receipt.primitiveRootZeta,
      zetaOrderVerified: receipt.zetaOrderVerified,
      nttHomomorphismVerified: receipt.nttHomomorphismVerified,
      responseInfinityNorm: receipt.responseInfinityNorm,
      normBoundLimit: receipt.normBoundLimit,
      normBoundSatisfied: receipt.normBoundSatisfied,
      publicKeyRootHex: receipt.publicKeyRootHex,
      signatureDigestHex: receipt.signatureDigestHex,
      verificationPassed: receipt.verificationPassed,
      executionLatencyUs: receipt.latencyUs,
    };
  }
}
