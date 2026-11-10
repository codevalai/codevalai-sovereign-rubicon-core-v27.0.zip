/-
  @file formal/SovereignNilpotentBijection.lean
  @version 26.1.0 (Lean 4 Formal Verification of GF(2)^32 HaPPY Bulk Recovery Bijection)
  @description Machine-checked theorem proving that T(x) = x ^^^ (x <<< 1) is a bijection
  over BitVec 32 with exact 5-step nilpotent geometric series inverse:
  T⁻¹(y) = (I + S_L)(I + S_L²)(I + S_L⁴)(I + S_L⁸)(I + S_L¹⁶)(y).
-/

import Std.Data.BitVec

namespace SovereignRubicon.HaPPYBijection

/-- Forward unitriangular operator T(x) = (I + S_L)(x) = x ⊕ (x << 1) over GF(2)^32 -/
def forwardIPlusShl1 (x : BitVec 32) : BitVec 32 :=
  x ^^^ (x <<< 1)

/-- 5-step O(log₂ 32) Nilpotent Geometric Series Inverse (I + S_L)⁻¹ over GF(2)^32 -/
def invertIPlusShl1 (y : BitVec 32) : BitVec 32 :=
  let x1 := y  ^^^ (y  <<< 1)
  let x2 := x1 ^^^ (x1 <<< 2)
  let x3 := x2 ^^^ (x2 <<< 4)
  let x4 := x3 ^^^ (x3 <<< 8)
  x4 ^^^ (x4 <<< 16)

/--
  Theorem 1 (Left Inverse): For every 32-bit word x ∈ GF(2)^32,
  invertIPlusShl1 (forwardIPlusShl1 x) = x.
  Proof via bit-blasting decision procedure (`bv_decide`).
-/
theorem invert_forward_bijection (x : BitVec 32) :
    invertIPlusShl1 (forwardIPlusShl1 x) = x := by
  bv_decide

/--
  Theorem 2 (Right Inverse): For every 32-bit syndrome word y ∈ GF(2)^32,
  forwardIPlusShl1 (invertIPlusShl1 y) = y.
-/
theorem forward_invert_bijection (y : BitVec 32) :
    forwardIPlusShl1 (invertIPlusShl1 y) = y := by
  bv_decide

/--
  Theorem 3 (Trivial Kernel / Injectivity):
  forwardIPlusShl1 x = 0#32 ↔ x = 0#32.
-/
theorem trivial_kernel_injective (x : BitVec 32) :
    forwardIPlusShl1 x = 0#32 ↔ x = 0#32 := by
  constructor
  · intro h
    have h_inv := congrArg invertIPlusShl1 h
    rw [invert_forward_bijection] at h_inv
    exact h_inv
  · intro h
    subst h
    rfl

end SovereignRubicon.HaPPYBijection
