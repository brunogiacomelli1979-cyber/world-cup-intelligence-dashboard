# World Cup Intelligence Dashboard

Dashboard interativo para contar a história das Copas do Mundo através dos números.

O projeto combina dados masculinos e femininos da Fjelstul World Cup Database para explorar edições, gols, seleções, jogadores, finais, pênaltis, cartões, sedes, estádios e outras camadas históricas da competição.

**Dashboard publicado:**  
[https://brunogiacomelli1979-cyber.github.io/world-cup-intelligence-dashboard/](https://brunogiacomelli1979-cyber.github.io/world-cup-intelligence-dashboard/)

## O que mudou nesta versão

- Cobertura ampliada para 31 torneios oficiais, de 1930 a 2023.
- Uso dos 27 arquivos CSV curados disponíveis na base completa.
- Separação entre HTML, CSS, JavaScript, dados e scripts de geração.
- Novo arquivo analítico `data/dashboard-data.json`, gerado automaticamente.
- Novas abas: linha do tempo, seleções, jogadores, jogos e drama, disciplina, sedes e metodologia.
- Nova aba **Histórias**, com capítulos editoriais sobre expansão, domínio, lendas, drama e comparação masculino x feminino.
- Novos índices narrativos, incluindo índice de drama e índice de protagonismo de jogadores.
- Correção de encoding dos textos em português.
- Validação básica dos dados antes da publicação.

## Números da base

- 31 torneios
- 22 Copas masculinas
- 9 Copas femininas
- 1.312 partidas
- 3.801 gols
- 10.912 jogadores
- 29.334 aparições de jogadores
- 11.210 substituições
- 3.292 cartões
- 251 estádios

## Experiência do dashboard

O dashboard foi desenhado para funcionar como um atlas analítico das Copas:

- **Visão geral:** evolução de gols, partidas, média de gols e títulos.
- **Histórias:** capítulos narrativos, Copas marcantes e comparação masculino x feminino.
- **Linha do tempo:** expansão das edições e índice de drama.
- **Seleções:** potências históricas e tabela consolidada.
- **Jogadores:** artilharia, protagonismo e hall de lendas.
- **Jogos & drama:** goleadas, pênaltis, prorrogações e jogos decisivos.
- **Disciplina:** cartões por edição e distribuição dos gols por minuto.
- **Sedes:** estádios mais presentes e campanha dos anfitriões.
- **Metodologia:** fonte, regras de cálculo e reprodutibilidade.

## Fonte dos dados

- **Base:** Fjelstul World Cup Database
- **Autor:** Joshua C. Fjelstul, Ph.D.
- **Licença:** CC-BY-SA 4.0

Este projeto deriva da base original e preserva a atribuição exigida pela licença. Consulte `data/LICENSE_SOURCE.txt` para o texto de licença da fonte utilizada.

## Estrutura do projeto

```text
world-cup-intelligence-dashboard/
├── index.html
├── README.md
├── assets/
│   ├── app.js
│   ├── styles.css
│   ├── preview-01.png
│   └── preview-02.png
├── data/
│   ├── dashboard-data.json
│   ├── LICENSE_SOURCE.txt
│   └── curated/
│       └── *_curated.csv
└── scripts/
    ├── build_dashboard_data.py
    └── validate_dashboard_data.py
```

## Como reproduzir

Regenere o arquivo analítico:

```bash
python scripts/build_dashboard_data.py
```

Valide os principais totais e vínculos:

```bash
python scripts/validate_dashboard_data.py
```

Sirva localmente para testar o carregamento do JSON:

```bash
python -m http.server 8000
```

Depois acesse:

```text
http://127.0.0.1:8000
```

## Metodologia resumida

- As categorias são padronizadas como **Masculina** e **Feminina**.
- **West Germany** é consolidada visualmente como **Germany**.
- Campeões e vice-campeões vêm de `tournament_standings_curated.csv`, o que trata corretamente a exceção histórica de 1950.
- A artilharia exclui gols contra.
- O índice de drama combina pênaltis, prorrogações, jogos eliminatórios apertados e partidas de alta pontuação.
- O índice de força histórica combina títulos, vices, vitórias, saldo de gols e participações.
- O índice de protagonismo de jogadores combina aparições, titularidades, gols e longevidade em torneios.

## Stack

- Python
- HTML
- CSS
- JavaScript
- Apache ECharts
- GitHub Pages

## Autor

**Bruno Giacomelli**

Projeto desenvolvido como peça de portfólio em Data Analytics, com foco em narrativa histórica, curadoria de dados e visualização interativa.
