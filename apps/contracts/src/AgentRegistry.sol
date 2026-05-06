// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title AgentRegistry — ERC-8004 soulbound identity NFTs
/// @notice One NFT per agent. Soulbound (non-transferable). Tracks reputation for oracle nodes.
/// @dev Agent types: 0=Bettor, 1=Trader, 2=OracleNode.
contract AgentRegistry is ERC721, AccessControl {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant REPUTATION_ROLE = keccak256("REPUTATION_ROLE");

    enum AgentType {
        Bettor,
        Trader,
        OracleNode
    }

    struct Agent {
        AgentType agentType;
        address controller;
        string metadataURI;
        int256 reputation;
        uint64 registeredAt;
    }

    uint256 public nextTokenId;
    mapping(uint256 tokenId => Agent) public agents;
    mapping(address controller => uint256 tokenId) public controllerToToken;

    event AgentRegistered(uint256 indexed tokenId, AgentType agentType, address indexed controller, string metadataURI);
    event ReputationDelta(uint256 indexed tokenId, int256 delta, int256 newReputation);

    error Soulbound();
    error AlreadyRegistered();
    error NotController();

    constructor(address admin) ERC721("OmenVault Agent", "OVA") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
        _grantRole(REPUTATION_ROLE, admin);
        nextTokenId = 1;
    }

    function register(AgentType agentType, address controller, string calldata metadataURI)
        external
        onlyRole(REGISTRAR_ROLE)
        returns (uint256 tokenId)
    {
        if (controllerToToken[controller] != 0) revert AlreadyRegistered();
        tokenId = nextTokenId++;
        agents[tokenId] = Agent({
            agentType: agentType,
            controller: controller,
            metadataURI: metadataURI,
            reputation: 0,
            registeredAt: uint64(block.timestamp)
        });
        controllerToToken[controller] = tokenId;
        _safeMint(controller, tokenId);
        emit AgentRegistered(tokenId, agentType, controller, metadataURI);
    }

    function adjustReputation(uint256 tokenId, int256 delta) external onlyRole(REPUTATION_ROLE) {
        Agent storage a = agents[tokenId];
        a.reputation += delta;
        emit ReputationDelta(tokenId, delta, a.reputation);
    }

    function isAgent(address controller, AgentType expected) external view returns (bool) {
        uint256 tokenId = controllerToToken[controller];
        if (tokenId == 0) return false;
        return agents[tokenId].agentType == expected;
    }

    function tokenIdOf(address controller) external view returns (uint256) {
        return controllerToToken[controller];
    }

    /// @dev Soulbound — block transfers but allow mint and burn.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
