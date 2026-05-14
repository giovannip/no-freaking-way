# No Freaking Way

App web (Next.js): lobbies com código de 6 caracteres, até 12 jogadores, perguntas em [`data/questions.json`](./data/questions.json). Estado do jogo e das salas fica **em memória no processo do servidor** (sem base de dados externa, sem WebSocket dedicado): o cliente usa **polling HTTP** e `POST` de ações.

## Limitação em produção (Vercel)

Em deploy serverless podem existir **várias instâncias** ou **cold starts**: uma sala pode não ser vista por todos ou pode perder-se. Para multiplayer fiável seria preciso um store partilhado (ex.: Redis/KV) ou um único processo long-running.

## Desenvolvimento local

1. `npm run dev` e abra `http://127.0.0.1:3000`.
2. Crie um lobby ou entre com o código; use duas abas para testar. Em cada aba: **nome** e **avatar** escolhido entre pré-definições ([`src/lib/avatar-presets.ts`](./src/lib/avatar-presets.ts) — ilustrações Dicebear “personas”).

## Deploy (Vercel)

Ligue o repositório ao Vercel. Não são necessárias variáveis de ambiente para o fluxo base do jogo.

## Regras do jogo

Estado autoritativo no servidor Next (`src/lib/game-room-store.ts`): perguntas do pool JSON sem repetir na sala até esgotar o baralho (depois reembaralha), palpites crescentes ou **NEM FUDENDO**, ranking ao fim de cada rodada. O host é quem abre o link com `?h=` (segredo devolvido ao criar o lobby).

## Mockups

Telas de referência em [`design/mockups/`](./design/mockups/).
