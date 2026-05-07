// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Market} from "./Market.sol";
import {AgentRegistry} from "./AgentRegistry.sol";

/// @title MarketFactory — permissionless prediction-market creation
/// @notice Creates new Market contracts. Each Market deploys its own CollateralVault.
contract MarketFactory is AccessControl {
    bytes32 public constant TEMPLATE_ADMIN = keccak256("TEMPLATE_ADMIN");

    struct MarketParams {
        string question;
        uint64 resolutionAt;
        bytes32 alloraTopicId;
        uint8 collateralTier; // 0=USDT0 only, 1=USDY, 2=sUSDe
        uint16 minStakeBps;
        /// @notice LMSR liquidity parameter (wad). 0 = use factoryDefaultLiquidityB.
        uint256 liquidityB;
    }

    AgentRegistry public immutable agentRegistry;
    address public immutable usdt0;
    address public immutable usdy;
    address public immutable sUSDe;
    address public immutable oracleSwarm;
    address public immutable alloraConsumer;
    address public immutable decisionLog;

    /// @notice Default LMSR `b` if a market doesn't specify one. 1000 USDT0 in wad.
    uint256 public factoryDefaultLiquidityB = 1000e18;

    address[] public allMarkets;
    mapping(address market => MarketParams) public marketParams;

    event MarketCreated(
        address indexed market,
        string question,
        uint64 resolutionAt,
        uint8 collateralTier,
        bytes32 alloraTopicId,
        uint256 liquidityB
    );
    event DefaultLiquidityBUpdated(uint256 newDefault);

    error InvalidResolutionTime();
    error InvalidCollateralTier();

    constructor(
        address admin,
        AgentRegistry registry,
        address usdt0_,
        address usdy_,
        address sUSDe_,
        address oracleSwarm_,
        address alloraConsumer_,
        address decisionLog_
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(TEMPLATE_ADMIN, admin);
        agentRegistry = registry;
        usdt0 = usdt0_;
        usdy = usdy_;
        sUSDe = sUSDe_;
        oracleSwarm = oracleSwarm_;
        alloraConsumer = alloraConsumer_;
        decisionLog = decisionLog_;
    }

    function setDefaultLiquidityB(uint256 newDefault) external onlyRole(TEMPLATE_ADMIN) {
        factoryDefaultLiquidityB = newDefault;
        emit DefaultLiquidityBUpdated(newDefault);
    }

    function createMarket(MarketParams calldata params) external returns (address market) {
        if (params.resolutionAt <= block.timestamp) revert InvalidResolutionTime();
        if (params.collateralTier > 2) revert InvalidCollateralTier();

        uint256 liquidity = params.liquidityB == 0 ? factoryDefaultLiquidityB : params.liquidityB;

        market = address(
            new Market(
                params.question,
                params.resolutionAt,
                params.alloraTopicId,
                params.collateralTier,
                params.minStakeBps,
                liquidity,
                usdt0,
                usdy,
                sUSDe,
                oracleSwarm,
                alloraConsumer,
                decisionLog,
                address(agentRegistry)
            )
        );

        marketParams[market] = params;
        allMarkets.push(market);

        emit MarketCreated(
            market, params.question, params.resolutionAt, params.collateralTier, params.alloraTopicId, liquidity
        );
    }

    function marketsLength() external view returns (uint256) {
        return allMarkets.length;
    }
}
