// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {FixedPointMathLib} from "solmate/utils/FixedPointMathLib.sol";

/// @title LMSR — Logarithmic Market Scoring Rule for binary outcomes
/// @notice All inputs and outputs are wad-scaled (1e18). `b` is the liquidity parameter (wad).
/// @dev Cost function:        C(q_y, q_n) = b * ln(exp(q_y/b) + exp(q_n/b))
///      Marginal price (YES): p_y = exp(q_y/b) / (exp(q_y/b) + exp(q_n/b))
///
///      Numerical stability: every internal exp() argument is normalized to <= 0
///      by subtracting max(q_y, q_n), so we stay in safe range for `expWad`.
///      The only argument that can be > 0 is the input `cost/b` ratio in
///      `sharesForCost`; callers must keep cost / b below ~100 to avoid overflow
///      (use a larger `b` for larger markets).
library LMSR {
    int256 internal constant ONE_WAD = 1e18;

    error LMSRBadInput();

    /// @notice Cost in wad to add `delta` shares to side A (side B unchanged).
    function costToBuy(uint256 qA, uint256 qB, uint256 b, uint256 delta) internal pure returns (uint256) {
        return _C(qA + delta, qB, b) - _C(qA, qB, b);
    }

    /// @notice Inverse cost: given `cost` (wad), compute how many shares of side A
    ///         to mint while side B is unchanged.
    /// @dev Closed-form solution:
    ///      Δq_A = (m - q_A) + b * ln( e^(cost/b) * (e^((q_A-m)/b) + e^((q_B-m)/b))
    ///                                  - e^((q_B-m)/b) )
    ///      where m = max(q_A, q_B). Subtracting m keeps inner exponents <= 0.
    function sharesForCost(uint256 qA, uint256 qB, uint256 b, uint256 cost) internal pure returns (uint256) {
        if (b == 0 || cost == 0) revert LMSRBadInput();

        uint256 m = qA > qB ? qA : qB;
        // Normalized exponent args (wad). Both <= 0 because m >= qA, m >= qB.
        int256 xA = -int256(((m - qA) * uint256(ONE_WAD)) / b);
        int256 xB = -int256(((m - qB) * uint256(ONE_WAD)) / b);
        int256 cWad = int256((cost * uint256(ONE_WAD)) / b);

        int256 expA = FixedPointMathLib.expWad(xA);
        int256 expB = FixedPointMathLib.expWad(xB);
        int256 expC = FixedPointMathLib.expWad(cWad);

        // numerator = e^(cost/b) * (expA + expB) - expB     (all in wad)
        int256 sumOld = expA + expB;
        int256 numerator = (expC * sumOld) / ONE_WAD - expB;
        if (numerator <= 0) revert LMSRBadInput();

        int256 lnNum = FixedPointMathLib.lnWad(numerator);
        // delta = (m - qA) + b * lnNum / 1e18
        int256 delta = int256(m - qA) + (int256(b) * lnNum) / ONE_WAD;
        if (delta < 0) revert LMSRBadInput();
        return uint256(delta);
    }

    /// @notice Marginal prices for YES and NO in wad (sum to 1e18).
    function prices(uint256 qY, uint256 qN, uint256 b) internal pure returns (uint256 pY, uint256 pN) {
        if (qY == 0 && qN == 0) return (5e17, 5e17);
        if (b == 0) revert LMSRBadInput();

        uint256 m = qY > qN ? qY : qN;
        int256 xY = -int256(((m - qY) * uint256(ONE_WAD)) / b);
        int256 xN = -int256(((m - qN) * uint256(ONE_WAD)) / b);

        int256 expY = FixedPointMathLib.expWad(xY);
        int256 expN = FixedPointMathLib.expWad(xN);
        int256 sum = expY + expN;
        pY = uint256((expY * ONE_WAD) / sum);
        pN = uint256(ONE_WAD) - pY;
    }

    /// @dev C(q_y, q_n) = max(q_y, q_n) + b * ln(1 + e^((min - max)/b))
    function _C(uint256 qY, uint256 qN, uint256 b) private pure returns (uint256) {
        uint256 mx = qY > qN ? qY : qN;
        uint256 mn = qY > qN ? qN : qY;
        int256 diff = -int256(((mx - mn) * uint256(ONE_WAD)) / b);
        int256 expDiff = FixedPointMathLib.expWad(diff);
        int256 sum = ONE_WAD + expDiff;
        int256 lnSum = FixedPointMathLib.lnWad(sum);
        return mx + (b * uint256(lnSum)) / uint256(ONE_WAD);
    }
}
