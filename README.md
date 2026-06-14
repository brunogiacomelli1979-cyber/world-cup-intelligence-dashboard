# World Cup Intelligence

Dashboard interativo em HTML criado para portfólio, com foco em contar a história das Copas do Mundo por meio de números marcantes, comparações entre países e leitura visual clara.

## Visão geral

O projeto transforma dados históricos da **Fjelstul World Cup Database** em um dashboard estático, publicável no GitHub Pages, com filtros por:

- categoria
- ano / edição
- Copa
- seleção / país

O objetivo é destacar informações que realmente ajudam a entender a trajetória da competição ao longo do tempo.

## O que o dashboard mostra

- evolução de gols, partidas e média por edição
- países com mais títulos e mais finais
- vitórias históricas por seleção
- artilheiros(as) mais importantes
- distribuição de gols por faixa de minuto
- finais históricas
- maiores goleadas

## Fonte de dados

- **Base:** Fjelstul World Cup Database
- **Autor:** Joshua C. Fjelstul, Ph.D.
- **Licença:** CC-BY-SA 4.0

## Tratamento e metodologia

O projeto foi construído com **Python + Pandas** para preparação dos dados e **Apache ECharts** para visualização em HTML.

Principais decisões de tratamento:

- padronização das categorias em **Masculina** e **Feminina**
- extração do ano da edição a partir do nome do torneio
- criação de métricas derivadas, como:
  - gols totais
  - margem de vitória
  - pontos por seleção
  - taxa de vitórias
- consolidação visual de **West Germany** em **Germany** nos gráficos por país
- tratamento da Copa de **1950** como exceção histórica, já que o campeão foi definido pela rodada final

## Estrutura sugerida para publicação

```text
world-cup-intelligence/
├── index.html
└── README.md
```

## Observações

- O dashboard usa **ECharts via CDN**, então deve ser aberto com internet ativa.
- O layout foi desenhado para funcionar bem em desktop e continuar legível em telas menores.
- O projeto foi estruturado para servir como peça de portfólio, com foco em apresentação, clareza e narrativa analítica.

## Stack

- Python
- Pandas
- HTML
- CSS
- JavaScript
- Apache ECharts

## Licença e crédito da base

Ao publicar ou reaproveitar este projeto, mantenha o crédito da base original conforme a licença CC-BY-SA 4.0.
