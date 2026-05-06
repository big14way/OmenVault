// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice Stable view surface that traders and Market read.
interface IAlloraConsumer {
    function getForecast(bytes32 topicId, uint64 maxStaleness) external view returns (uint256 valueE18);
}
