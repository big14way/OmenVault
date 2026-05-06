// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title DecisionLog — append-only audit trail for agent decisions
/// @notice Every agent decision (trade, vote, signal) emits an event with an IPFS payload hash.
contract DecisionLog is AccessControl {
    bytes32 public constant LOGGER_ROLE = keccak256("LOGGER_ROLE");

    enum Kind {
        TRADE,
        ORACLE_VOTE,
        SIGNAL,
        OTHER
    }

    event Decision(
        uint256 indexed agentId, uint8 indexed kind, bytes32 payloadHash, string ipfsCid, uint64 at, address actor
    );

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(LOGGER_ROLE, admin);
    }

    function logDecision(uint256 agentId, Kind kind, bytes32 payloadHash, string calldata ipfsCid)
        external
        onlyRole(LOGGER_ROLE)
    {
        emit Decision(agentId, uint8(kind), payloadHash, ipfsCid, uint64(block.timestamp), msg.sender);
    }
}
