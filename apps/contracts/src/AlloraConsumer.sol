// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IAlloraConsumer} from "./interfaces/IAlloraConsumer.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title AlloraConsumer — wraps Allora's on-chain inference reads
/// @notice Reads forecast values for topics; verifies attestor signature; surfaces predictions to traders.
contract AlloraConsumer is AccessControl {
    bytes32 public constant ATTESTOR_ROLE = keccak256("ATTESTOR_ROLE");

    struct Forecast {
        bytes32 topicId;
        uint256 valueE18;
        uint64 timestamp;
        address attestor;
    }

    /// @dev Latest forecast per topic.
    mapping(bytes32 topicId => Forecast) public latest;

    event ForecastWritten(bytes32 indexed topicId, uint256 valueE18, uint64 timestamp, address attestor);

    error StaleForecast();
    error UnauthorizedAttestor();

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ATTESTOR_ROLE, admin);
    }

    /// @notice Write a new forecast for a topic. In production, attestor signature would be verified
    /// against Allora's on-chain consumer pattern. For Sepolia + demo, the trusted attestor role gates writes.
    /// @dev TODO(team): swap to Allora's standard consumer interface once stable on Mantle Sepolia.
    function writeForecast(bytes32 topicId, uint256 valueE18) external onlyRole(ATTESTOR_ROLE) {
        latest[topicId] =
            Forecast({topicId: topicId, valueE18: valueE18, timestamp: uint64(block.timestamp), attestor: msg.sender});
        emit ForecastWritten(topicId, valueE18, uint64(block.timestamp), msg.sender);
    }

    function getForecast(bytes32 topicId, uint64 maxStaleness) external view returns (uint256 valueE18) {
        Forecast memory f = latest[topicId];
        if (f.timestamp + maxStaleness < block.timestamp) revert StaleForecast();
        return f.valueE18;
    }

    function getLatest(bytes32 topicId) external view returns (Forecast memory) {
        return latest[topicId];
    }
}
