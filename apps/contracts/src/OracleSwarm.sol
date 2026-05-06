// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {AgentRegistry} from "./AgentRegistry.sol";

/// @title OracleSwarm — multi-agent resolution
/// @notice Three independent ERC-8004 oracle agents post signed verdicts; majority wins.
/// @dev If 1-1-1 disagreement, finalize() reverts so the swarm can re-vote.
interface IMarket {
    function resolve(uint8 finalOutcome) external;
}

contract OracleSwarm is AccessControl {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    enum Vote {
        YES,
        NO,
        INVALID
    }

    struct Resolution {
        address market;
        uint8[3] votes;
        uint256[3] oracleAgentIds;
        bytes32[3] reasoningHashes;
        uint8 voteCount;
        uint8 finalOutcome;
        uint64 finalizedAt;
        bool finalized;
    }

    AgentRegistry public immutable agentRegistry;
    mapping(address market => Resolution) public resolutions;
    mapping(address market => mapping(uint256 agentId => bool)) public hasVoted;

    event VoteSubmitted(
        address indexed market, uint256 indexed oracleAgentId, uint8 vote, bytes32 reasoningHash, uint8 voteCount
    );
    event Finalized(address indexed market, uint8 finalOutcome, uint64 at);

    error AlreadyVoted();
    error NotOracle();
    error AlreadyFinalized();
    error NeedThreeVotes();
    error TieDisagreement();
    error InvalidSignature();

    constructor(address admin, AgentRegistry registry) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        agentRegistry = registry;
    }

    function submitVote(address market, uint8 vote, bytes32 reasoningHash, bytes calldata signature) external {
        if (!hasRole(ORACLE_ROLE, msg.sender)) revert NotOracle();

        uint256 agentId = agentRegistry.tokenIdOf(msg.sender);
        if (hasVoted[market][agentId]) revert AlreadyVoted();

        bytes32 digest = keccak256(abi.encode(market, vote, reasoningHash)).toEthSignedMessageHash();
        address signer = digest.recover(signature);
        if (signer != msg.sender) revert InvalidSignature();

        Resolution storage r = resolutions[market];
        if (r.finalized) revert AlreadyFinalized();

        if (r.voteCount == 0) r.market = market;
        uint8 idx = r.voteCount;
        r.votes[idx] = vote;
        r.oracleAgentIds[idx] = agentId;
        r.reasoningHashes[idx] = reasoningHash;
        r.voteCount = idx + 1;
        hasVoted[market][agentId] = true;

        emit VoteSubmitted(market, agentId, vote, reasoningHash, r.voteCount);
    }

    function finalize(address market) external {
        Resolution storage r = resolutions[market];
        if (r.finalized) revert AlreadyFinalized();
        if (r.voteCount < 3) revert NeedThreeVotes();

        uint8[3] memory tally;
        tally[r.votes[0]] += 1;
        tally[r.votes[1]] += 1;
        tally[r.votes[2]] += 1;

        uint8 winner;
        uint8 maxCount;
        bool tie;
        for (uint8 i = 0; i < 3; i++) {
            if (tally[i] > maxCount) {
                maxCount = tally[i];
                winner = i;
                tie = false;
            } else if (tally[i] == maxCount && tally[i] > 0) {
                tie = true;
            }
        }
        if (maxCount < 2 || tie) revert TieDisagreement();

        r.finalOutcome = winner;
        r.finalizedAt = uint64(block.timestamp);
        r.finalized = true;

        for (uint8 i = 0; i < 3; i++) {
            int256 delta = r.votes[i] == winner ? int256(1) : int256(-1);
            agentRegistry.adjustReputation(r.oracleAgentIds[i], delta);
        }

        // Markets store outcome shifted by +1 because UNRESOLVED = 0.
        IMarket(market).resolve(winner + 1);
        emit Finalized(market, winner, r.finalizedAt);
    }

    function getResolution(address market) external view returns (Resolution memory) {
        return resolutions[market];
    }
}
