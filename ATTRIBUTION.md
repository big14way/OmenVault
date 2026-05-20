# Attribution

OmenVault was built for **The Turing Test Hackathon 2026** (Mantle) — Phase II "AI Awakening", May 1 – June 15, 2026.

## Partner integrations

| Partner | Role | Where in code |
|---|---|---|
| Mantle | Settlement chain (Mantle Sepolia) | All contract deployments |
| Allora | On-chain forecast oracle that drives trader sizing | `apps/contracts/src/AlloraConsumer.sol`, `bots/trader/src/allora.ts` |
| Nansen | Smart-money flow signals | `bots/nansen-watcher/` |
| Ethena (sUSDe) | High-yield collateral tier | `apps/contracts/src/CollateralVault.sol`, `apps/contracts/src/interfaces/ISUSDe.sol` |
| Ondo (USDY) | Conservative collateral tier | `apps/contracts/src/CollateralVault.sol`, `apps/contracts/src/interfaces/IUSDY.sol` |
| Pyth | Price feeds | `apps/contracts/src/interfaces/IPyth.sol` |
| Byreal | Skills CLI for protocol UX | `bots/byreal-skills/` |
| Anthropic | LLM reasoning for trader and oracle agents | `bots/trader/`, `bots/oracle-swarm/` |

## Open source dependencies

- **OpenZeppelin Contracts v5.0.2** — ERC-721 base, AccessControl, ReentrancyGuard
- **Foundry** — contract toolchain
- **Next.js 15** — App Router web framework
- **viem / wagmi** — frontend RPC and wallet integration
- **ethers v6** — bot-side signing and reads

## Hackathon

Built by the OmenVault team. Tracks: **AI × RWA** (primary, sponsored by Mantle), **Agentic Economy** (secondary, sponsored by Byreal). Submitted to [DoraHacks](https://dorahacks.io/hackathon/mantleturingtesthackathon2026).
