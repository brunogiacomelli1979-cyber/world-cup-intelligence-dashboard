# Data Dictionary

Este projeto usa os arquivos curados em `data/curated/` e gera um arquivo otimizado para a interface em `data/dashboard-data.json`.

## Arquivos principais

| Arquivo | Papel no dashboard |
| --- | --- |
| `tournaments_curated.csv` | Cobertura, ano, categoria, país-sede, tamanho da edição e metadados do torneio. |
| `tournament_standings_curated.csv` | Campeões, vice-campeões e rankings finais. |
| `matches_curated.csv` | Partidas, fases, placares, prorrogações, pênaltis, estádios e cidades. |
| `goals_curated.csv` | Gols, artilharia, gols por minuto, gols contra e pênaltis. |
| `team_appearances_curated.csv` | Jogos, vitórias, empates, derrotas, gols pró, gols contra e saldo por seleção. |
| `player_appearances_curated.csv` | Aparições, titularidades e base do índice de protagonismo. |
| `bookings_curated.csv` | Cartões amarelos, vermelhos, segundos amarelos e disciplina por edição. |
| `penalty_kicks_curated.csv` | Cobranças e conversões em disputas de pênaltis. |
| `substitutions_curated.csv` | Volume de substituições por edição e contexto de uso futuro. |
| `stadiums_curated.csv` | Estádios, cidades, países e capacidade. |
| `host_countries_curated.csv` | Campanha dos países-sede. |
| `managers_curated.csv` e `manager_appearances_curated.csv` | Técnicos e partidas dirigidas. |
| `referees_curated.csv` e `referee_appearances_curated.csv` | Árbitros, confederações e partidas apitadas. |
| `award_winners_curated.csv` | Premiações oficiais e contexto para futuras histórias. |

## Métricas derivadas

| Métrica | Definição |
| --- | --- |
| Gols por jogo | `gols / partidas` por edição. |
| Cartões por jogo | `cartões / partidas` por edição. |
| Aproveitamento | `vitórias / jogos` por seleção. |
| Saldo de gols | `gols pró - gols contra` por seleção. |
| Índice de drama | Soma ponderada de pênaltis, prorrogações, jogos eliminatórios com margem mínima e partidas com pelo menos cinco gols. |
| Índice de protagonismo | Combinação de aparições, titularidades, gols e quantidade de torneios disputados. |

## Convenções

- `West Germany` é consolidada como `Germany` nas leituras visuais.
- Copas masculinas e femininas são mantidas na mesma experiência, mas filtráveis.
- A Copa de 1950 usa a classificação final oficial em vez de uma final inexistente.
- A artilharia ignora gols contra.
- Os dados exibidos no dashboard devem ser regenerados com `scripts/build_dashboard_data.py`.
