/**
 * @package @codevalai/fibonacci-braid-ztau
 * @version 28.0.0
 * @description Non-Abelian Fibonacci Anyon Braid Group B_3, Dehornoy Sigma-Positive Handle Reduction,
 * and Exact Symbolic Golden-Ring Z[tau] (tau^2 = tau + 1) Markov/Kauffman Trace Evaluator.
 * Repository: https://github.com/codevalai/fibonacci-braid-ztau
 */

import {
  SovereignBraidCanonicalizer,
  type ZTauElement,
} from '../../src/server/SovereignOmegaOrchestratorV26.js';
import {
  dehornoyHandleReduceBraid,
  evaluateFibonacciAnyonBraid,
} from '../../src/server/SovereignZenithV25Core.js';

export {
  SovereignBraidCanonicalizer,
  type ZTauElement,
  dehornoyHandleReduceBraid,
  evaluateFibonacciAnyonBraid,
};

export class FibonacciBraidZTauSDK {
  public static runSelfTest(rawGenerators: number[] = [1, 2, 1, -2, 2, 1, 2, -1, 1]): {
    packageName: '@codevalai/fibonacci-braid-ztau';
    rawGenerators: number[];
    canonicalGenerators: number[];
    exactZTauTrace: string;
    numericalMarkovTrace: string;
    yangBaxterResidual: number;
    executionLatencyUs: number;
  } {
    const res = SovereignBraidCanonicalizer.evaluateFibonacciBraid(rawGenerators);
    return {
      packageName: '@codevalai/fibonacci-braid-ztau',
      rawGenerators,
      canonicalGenerators: res.canonicalGenerators,
      exactZTauTrace: res.exactZTauTrace,
      numericalMarkovTrace: res.numericalMarkovTrace,
      yangBaxterResidual: res.yangBaxterResidual,
      executionLatencyUs: res.latencyUs,
    };
  }
}
