# Forge Management — Forge NPWD v4

Primeira versão visual do painel Boss/Management do Forge Core para Forge NPWD.

## Estado desta versão
- UI navegável com dados mockados.
- Telas: Início, Membros, Detalhes, Contratar, Cargos, Financeiro, Permissões e menu Mais.
- Ainda NÃO altera dados do Forge Core.
- Estrutura preparada para integrar jobs.json, gangs.json e permissões individuais posteriormente.

## Build
```bash
npm install
cd web && npm install && cd ..
npm run build
```

## Instalação
1. Coloque a pasta `forge-npwd-management` em `resources`.
2. Faça o build do resource.
3. Garanta que `forge-npwd` esteja instalado.
4. `ensure forge-npwd-management` conforme a ordem exigida pela sua versão do Forge NPWD.

> Esta estrutura segue o template oficial Forge NPWD v4 (RegisterExternalApp + Vite/IIFE).

## Próxima etapa
Conectar a UI à API real do Forge Core e substituir os mocks por organização, membros, grades, financeiro e permissões retornados pelo servidor.
