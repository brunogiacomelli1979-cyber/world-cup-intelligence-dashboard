const charts = {};
let DATA = null;
let state = { category: "Todos", tournament: "Todos", team: "Todos" };

const colors = ["#34d4bd", "#64a8ff", "#fb7185", "#f8c14f", "#a88bff", "#7ddf8a"];
const minuteOrder = ["0-15", "16-30", "31-45", "45+", "46-60", "61-75", "76-90", "90+"];
const stageOrder = ["Fase de grupos", "Oitavas", "Quartas", "Semifinal", "Final", "Outras fases"];

function chart(id) {
  if (!charts[id]) charts[id] = echarts.init(document.getElementById(id), null, { renderer: "canvas" });
  return charts[id];
}

function fmt(value) {
  return Number(value || 0).toLocaleString("pt-BR");
}

function dec(value, digits = 2) {
  return Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: digits });
}

function byNumber(key, limit = 10) {
  return (a, b) => (b[key] || 0) - (a[key] || 0) || String(a.team || a.player || a.name).localeCompare(String(b.team || b.player || b.name));
}

function selectedCategory(row) {
  return state.category === "Todos" || row.category === state.category;
}

function selectedTournament(row) {
  return state.tournament === "Todos" || row.tournament_id === state.tournament || row.id === state.tournament;
}

function selectedTeamMatch(row) {
  return state.team === "Todos" || row.home === state.team || row.away === state.team || row.team === state.team;
}

function scope() {
  const tournaments = DATA.tournaments.filter(row => selectedCategory(row) && selectedTournament(row));
  const tournamentIds = new Set(tournaments.map(row => row.id));
  const matches = DATA.matches.filter(row => tournamentIds.has(row.tournament_id) && selectedTeamMatch(row));
  const teams = deriveTeams(matches, tournaments).filter(row => state.team === "Todos" || row.team === state.team);
  const scorers = DATA.scorers
    .filter(row => selectedCategory(row))
    .filter(row => state.team === "Todos" || row.team === state.team);
  const players = DATA.players
    .filter(row => selectedCategory(row))
    .filter(row => state.team === "Todos" || row.team === state.team);
  const finals = DATA.finals.filter(row => selectedCategory(row) && (state.tournament === "Todos" || `${row.year} ${row.tournament}`.includes(tournamentLabel())));
  const bookings = DATA.bookings.filter(row => selectedCategory(row) && selectedTournament(row));
  const biggestMatches = DATA.biggest_matches.filter(row => selectedCategory(row) && selectedTournament(row) && selectedTeamMatch(row)).slice(0, 15);
  const dramaticMatches = DATA.dramatic_matches.filter(row => selectedCategory(row) && selectedTournament(row) && selectedTeamMatch(row)).slice(0, 15);
  const hosts = DATA.hosts.filter(row => selectedCategory(row));
  return { tournaments, tournamentIds, matches, teams, scorers, players, finals, bookings, biggestMatches, dramaticMatches, hosts };
}

function tournamentLabel() {
  const row = DATA.tournaments.find(item => item.id === state.tournament);
  return row ? row.name : "";
}

function deriveTeams(matches, tournaments) {
  const map = new Map();
  const ensure = team => {
    if (!map.has(team)) {
      map.set(team, {
        team,
        category: state.category,
        tournaments: 0,
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals_for: 0,
        goals_against: 0,
        goal_diff: 0,
        titles: 0,
        runner_up: 0,
        finals: 0,
        win_rate: 0
      });
    }
    return map.get(team);
  };

  matches.forEach(match => {
    const home = ensure(match.home);
    const away = ensure(match.away);
    home.matches += 1;
    away.matches += 1;
    home.goals_for += match.home_score;
    home.goals_against += match.away_score;
    away.goals_for += match.away_score;
    away.goals_against += match.home_score;
    if (match.home_score > match.away_score) {
      home.wins += 1;
      away.losses += 1;
    } else if (match.away_score > match.home_score) {
      away.wins += 1;
      home.losses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
    }
  });

  tournaments.forEach(tournament => {
    if (tournament.champion) {
      const champion = ensure(tournament.champion);
      champion.titles += 1;
      champion.finals += 1;
    }
    if (tournament.runner_up) {
      const runner = ensure(tournament.runner_up);
      runner.runner_up += 1;
      runner.finals += 1;
    }
  });

  const tournamentCount = new Map();
  matches.forEach(match => {
    [[match.home, match.tournament_id], [match.away, match.tournament_id]].forEach(([team, id]) => {
      const key = `${team}::${id}`;
      tournamentCount.set(key, team);
    });
  });
  tournamentCount.forEach(team => ensure(team).tournaments += 1);

  return [...map.values()].map(row => ({
    ...row,
    goal_diff: row.goals_for - row.goals_against,
    win_rate: row.matches ? +(row.wins / row.matches * 100).toFixed(1) : 0
  })).sort((a, b) => (b.titles - a.titles) || (b.finals - a.finals) || (b.wins - a.wins) || a.team.localeCompare(b.team));
}

function setEmpty(id, text = "Sem dados para o recorte selecionado.") {
  chart(id).setOption({
    title: { text, left: "center", top: "middle", textStyle: { color: "#9db1c8", fontSize: 14 } },
    xAxis: { show: false },
    yAxis: { show: false },
    series: []
  }, true);
}

function baseGrid() {
  return {
    grid: { left: 54, right: 34, top: 52, bottom: 54 },
    backgroundColor: "transparent",
    color: colors,
    textStyle: { color: "#c9d8ea" },
    tooltip: { trigger: "axis", backgroundColor: "#0b1724", borderColor: "#315a80", textStyle: { color: "#edf5ff" } },
    legend: { top: 8, textStyle: { color: "#c9d8ea" } },
    xAxis: { axisLine: { lineStyle: { color: "#315a80" } }, axisLabel: { color: "#9db1c8" }, splitLine: { show: false } },
    yAxis: { axisLine: { lineStyle: { color: "#315a80" } }, axisLabel: { color: "#9db1c8" }, splitLine: { lineStyle: { color: "rgba(49,90,128,.35)" } } }
  };
}

function renderMetricCards(s) {
  const totalGoals = s.tournaments.reduce((sum, row) => sum + row.goals, 0);
  const totalMatches = s.matches.length || s.tournaments.reduce((sum, row) => sum + row.matches, 0);
  const topScorer = s.scorers[0];
  const topTeam = s.teams.slice().sort(byNumber("titles"))[0];
  const topDrama = s.tournaments.slice().sort(byNumber("drama_index"))[0];
  const hero = [
    ["Cobertura", fmt(s.tournaments.length), "edições no recorte"],
    ["Partidas", fmt(totalMatches), "jogos oficiais"],
    ["Gols", fmt(totalGoals), `${dec(totalGoals / Math.max(totalMatches, 1), 2)} por jogo`],
    ["Maior campeão", topTeam ? topTeam.team : "-", topTeam ? `${fmt(topTeam.titles)} títulos` : "sem recorte"],
    ["Artilharia", topScorer ? fmt(topScorer.goals) : "-", topScorer ? `${topScorer.player} (${topScorer.team})` : "sem recorte"],
    ["Mais drama", topDrama ? topDrama.year : "-", topDrama ? topDrama.name : "sem recorte"]
  ];
  document.getElementById("heroMetrics").innerHTML = hero.map(([label, value, note]) => `
    <article class="metric-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <p>${note}</p>
    </article>
  `).join("");
}

function renderStory(s) {
  const title = state.team !== "Todos"
    ? `${state.team} em números`
    : state.tournament !== "Todos"
      ? tournamentLabel()
      : state.category === "Todos"
        ? "O retrato completo das Copas"
        : `Copas ${state.category.toLowerCase()}s em números`;
  document.getElementById("storyTitle").textContent = title;
  const mostGoals = s.tournaments.slice().sort(byNumber("goals"))[0];
  const highestAvg = s.tournaments.slice().sort(byNumber("goals_per_match"))[0];
  const cards = s.tournaments.slice().sort(byNumber("cards"))[0];
  const shootouts = s.tournaments.reduce((sum, row) => sum + row.shootouts, 0);
  const items = [
    ["Copa mais goleadora", mostGoals ? fmt(mostGoals.goals) : "-", mostGoals ? `${mostGoals.year}: ${mostGoals.goals} gols em ${mostGoals.matches} jogos.` : "Sem dados."],
    ["Ritmo ofensivo", highestAvg ? dec(highestAvg.goals_per_match, 2) : "-", highestAvg ? `${highestAvg.year} lidera em média de gols por jogo.` : "Sem dados."],
    ["Disciplina", cards ? fmt(cards.cards) : "-", cards ? `${cards.year} concentra o maior volume de cartões no recorte.` : "Sem dados."],
    ["Decisão extrema", fmt(shootouts), "partidas decididas por disputa de pênaltis no recorte."]
  ];
  document.getElementById("storyGrid").innerHTML = items.map(([label, value, text]) => `
    <div class="story-item">
      <span>${label}</span>
      <strong>${value}</strong>
      <p>${text}</p>
    </div>
  `).join("");
}

function renderEvolution(s) {
  if (!s.tournaments.length) return setEmpty("chartEvolution");
  const rows = s.tournaments.slice().sort((a, b) => a.year - b.year);
  chart("chartEvolution").setOption({
    ...baseGrid(),
    legend: { top: 8, textStyle: { color: "#c9d8ea" } },
    xAxis: { ...baseGrid().xAxis, type: "category", data: rows.map(row => row.year) },
    yAxis: [
      { ...baseGrid().yAxis, type: "value", name: "Volume" },
      { ...baseGrid().yAxis, type: "value", name: "Média" }
    ],
    series: [
      { name: "Gols", type: "bar", data: rows.map(row => row.goals), barMaxWidth: 24 },
      { name: "Jogos", type: "line", smooth: true, data: rows.map(row => row.matches) },
      { name: "Média de gols", type: "line", smooth: true, yAxisIndex: 1, data: rows.map(row => row.goals_per_match) }
    ]
  }, true);
}

function renderTitles(s) {
  const rows = s.teams.slice().sort(byNumber("titles")).filter(row => row.titles > 0).slice(0, 10).reverse();
  if (!rows.length) return setEmpty("chartTitles");
  chart("chartTitles").setOption({
    ...baseGrid(),
    grid: { left: 122, right: 36, top: 28, bottom: 34 },
    xAxis: { ...baseGrid().xAxis, type: "value" },
    yAxis: { ...baseGrid().yAxis, type: "category", data: rows.map(row => row.team) },
    series: [{ type: "bar", data: rows.map(row => row.titles), label: { show: true, position: "right", color: "#edf5ff" } }]
  }, true);
}

function renderEra(s) {
  if (!s.tournaments.length) return setEmpty("chartEra");
  const rows = s.tournaments.slice().sort((a, b) => a.year - b.year);
  chart("chartEra").setOption({
    ...baseGrid(),
    xAxis: { ...baseGrid().xAxis, type: "category", data: rows.map(row => row.year) },
    yAxis: [
      { ...baseGrid().yAxis, type: "value", name: "Times" },
      { ...baseGrid().yAxis, type: "value", name: "Cartões/jogo" }
    ],
    series: [
      { name: "Times", type: "bar", data: rows.map(row => row.teams), barMaxWidth: 24 },
      { name: "Cartões por jogo", type: "line", smooth: true, yAxisIndex: 1, data: rows.map(row => row.cards_per_match) }
    ]
  }, true);
}

function renderDramaIndex(s) {
  const rows = s.tournaments.slice().sort(byNumber("drama_index")).slice(0, 12).reverse();
  if (!rows.length) return setEmpty("chartDramaIndex");
  chart("chartDramaIndex").setOption({
    ...baseGrid(),
    grid: { left: 112, right: 28, top: 28, bottom: 34 },
    xAxis: { ...baseGrid().xAxis, type: "value" },
    yAxis: { ...baseGrid().yAxis, type: "category", data: rows.map(row => `${row.year}`) },
    series: [{ type: "bar", data: rows.map(row => row.drama_index), label: { show: true, position: "right", color: "#edf5ff", formatter: params => rows[params.dataIndex].champion } }]
  }, true);
}

function renderTeamPower(s) {
  const rows = s.teams.slice().sort((a, b) => (b.titles - a.titles) || (b.finals - a.finals) || (b.wins - a.wins)).slice(0, 12).reverse();
  if (!rows.length) return setEmpty("chartTeamPower");
  chart("chartTeamPower").setOption({
    ...baseGrid(),
    grid: { left: 120, right: 28, top: 52, bottom: 34 },
    xAxis: { ...baseGrid().xAxis, type: "value" },
    yAxis: { ...baseGrid().yAxis, type: "category", data: rows.map(row => row.team) },
    series: [
      { name: "Títulos", type: "bar", stack: "total", data: rows.map(row => row.titles) },
      { name: "Vices", type: "bar", stack: "total", data: rows.map(row => row.runner_up) },
      { name: "Vitórias/10", type: "bar", stack: "total", data: rows.map(row => Math.round(row.wins / 10)) }
    ]
  }, true);
}

function renderScorers(s) {
  const rows = s.scorers.slice(0, 15).reverse();
  if (!rows.length) return setEmpty("chartScorers");
  chart("chartScorers").setOption({
    ...baseGrid(),
    grid: { left: 138, right: 34, top: 28, bottom: 34 },
    xAxis: { ...baseGrid().xAxis, type: "value" },
    yAxis: { ...baseGrid().yAxis, type: "category", data: rows.map(row => row.player) },
    series: [{ type: "bar", data: rows.map(row => row.goals), label: { show: true, position: "right", color: "#edf5ff", formatter: params => rows[params.dataIndex].team } }]
  }, true);
}

function renderPlayerImpact(s) {
  const rows = s.players.slice(0, 15).reverse();
  if (!rows.length) return setEmpty("chartPlayerImpact");
  chart("chartPlayerImpact").setOption({
    ...baseGrid(),
    grid: { left: 138, right: 34, top: 28, bottom: 34 },
    xAxis: { ...baseGrid().xAxis, type: "value" },
    yAxis: { ...baseGrid().yAxis, type: "category", data: rows.map(row => row.player) },
    series: [{ type: "bar", data: rows.map(row => Math.round(row.impact_score)), label: { show: true, position: "right", color: "#edf5ff", formatter: params => `${rows[params.dataIndex].team} · ${rows[params.dataIndex].appearances} jogos` } }]
  }, true);
}

function renderCards(s) {
  const rows = s.bookings.slice().sort((a, b) => a.year - b.year);
  if (!rows.length) return setEmpty("chartCards");
  chart("chartCards").setOption({
    ...baseGrid(),
    xAxis: { ...baseGrid().xAxis, type: "category", data: rows.map(row => row.year) },
    yAxis: { ...baseGrid().yAxis, type: "value" },
    series: [
      { name: "Cartões", type: "bar", data: rows.map(row => row.cards), barMaxWidth: 24 },
      { name: "Vermelhos", type: "line", smooth: true, data: rows.map(row => row.reds) }
    ]
  }, true);
}

function renderMinutes(s) {
  const rows = minuteOrder.map(bucket => ({
    bucket,
    goals: DATA.minute_goals
      .filter(row => selectedCategory(row) && row.bucket === bucket)
      .reduce((sum, row) => sum + row.goals, 0)
  }));
  chart("chartMinutes").setOption({
    ...baseGrid(),
    xAxis: { ...baseGrid().xAxis, type: "category", data: rows.map(row => row.bucket) },
    yAxis: { ...baseGrid().yAxis, type: "value" },
    series: [{ type: "bar", data: rows.map(row => row.goals), barMaxWidth: 34, label: { show: true, position: "top", color: "#edf5ff" } }]
  }, true);
}

function renderStadiums(s) {
  const rows = DATA.stadiums.slice(0, 15).reverse();
  chart("chartStadiums").setOption({
    ...baseGrid(),
    grid: { left: 160, right: 30, top: 28, bottom: 34 },
    xAxis: { ...baseGrid().xAxis, type: "value" },
    yAxis: { ...baseGrid().yAxis, type: "category", data: rows.map(row => row.stadium) },
    series: [{ type: "bar", data: rows.map(row => row.matches), label: { show: true, position: "right", color: "#edf5ff", formatter: params => rows[params.dataIndex].city } }]
  }, true);
}

function renderTable(id, columns, rows) {
  const table = document.getElementById(id);
  const head = `<thead><tr>${columns.map(col => `<th class="${col.num ? "num" : ""}">${col.label}</th>`).join("")}</tr></thead>`;
  const bodyRows = rows.map(row => `<tr>${columns.map(col => `<td class="${col.num ? "num" : ""}">${col.format ? col.format(row[col.key], row) : row[col.key]}</td>`).join("")}</tr>`).join("");
  table.innerHTML = `${head}<tbody>${bodyRows || `<tr><td colspan="${columns.length}">Sem dados para o recorte selecionado.</td></tr>`}</tbody>`;
}

function renderTables(s) {
  renderTable("tableTeams", [
    { label: "Seleção", key: "team" },
    { label: "Títulos", key: "titles", num: true },
    { label: "Finais", key: "finals", num: true },
    { label: "Jogos", key: "matches", num: true },
    { label: "Vitórias", key: "wins", num: true },
    { label: "Gols", key: "goals_for", num: true },
    { label: "Saldo", key: "goal_diff", num: true },
    { label: "Aproveitamento", key: "win_rate", num: true, format: value => `${dec(value, 1)}%` }
  ], s.teams.slice().sort(byNumber("titles")).slice(0, 30));

  renderTable("tableBigMatches", [
    { label: "Ano", key: "year", num: true },
    { label: "Jogo", key: "match" },
    { label: "Placar", key: "score" },
    { label: "Fase", key: "stage_bucket" },
    { label: "Margem", key: "margin", num: true },
    { label: "Gols", key: "goals", num: true }
  ], s.biggestMatches);

  renderTable("tableDramaMatches", [
    { label: "Ano", key: "year", num: true },
    { label: "Jogo", key: "match" },
    { label: "Placar", key: "score" },
    { label: "Fase", key: "stage_bucket" },
    { label: "Prorrogação", key: "extra_time", format: value => value ? "sim" : "não" },
    { label: "Pênaltis", key: "shootout", format: value => value ? "sim" : "não" }
  ], s.dramaticMatches);

  renderTable("tableHosts", [
    { label: "Ano", key: "year", num: true },
    { label: "Categoria", key: "category" },
    { label: "Sede", key: "host" },
    { label: "Campanha", key: "progress" },
    { label: "Campeão", key: "champion" },
    { label: "Sede campeã?", key: "host_won", format: value => value ? "sim" : "não" }
  ], s.hosts.slice().sort((a, b) => a.year - b.year));

  renderTable("tableSources", [
    { label: "Arquivo", key: "file" },
    { label: "Uso no dashboard", key: "use" }
  ], [
    { file: "tournaments_curated.csv", use: "cobertura, categoria, sedes, tamanho das edições" },
    { file: "matches_curated.csv", use: "jogos, placares, fases, pênaltis, prorrogação e estádios" },
    { file: "goals_curated.csv", use: "artilharia, gols por edição, minutos e fases" },
    { file: "team_appearances_curated.csv", use: "tabela histórica por seleção" },
    { file: "player_appearances_curated.csv", use: "índice de protagonismo de jogadores" },
    { file: "bookings_curated.csv", use: "disciplina e cartões por edição" },
    { file: "stadiums_curated.csv", use: "palcos e geografia da competição" },
    { file: "managers/referees/awards", use: "base expandida pronta para novas narrativas" }
  ]);
}

function renderAll() {
  const s = scope();
  renderMetricCards(s);
  renderStory(s);
  renderEvolution(s);
  renderTitles(s);
  renderEra(s);
  renderDramaIndex(s);
  renderTeamPower(s);
  renderScorers(s);
  renderPlayerImpact(s);
  renderCards(s);
  renderMinutes(s);
  renderStadiums(s);
  renderTables(s);
  setTimeout(() => Object.values(charts).forEach(item => item.resize()), 40);
}

function populateFilters() {
  const tournamentSelect = document.getElementById("filterTournament");
  tournamentSelect.innerHTML = `<option value="Todos">Todas as Copas</option>` + DATA.tournaments
    .slice()
    .sort((a, b) => a.year - b.year)
    .map(row => `<option value="${row.id}">${row.year} · ${row.category} · ${row.host}</option>`)
    .join("");

  const teamSelect = document.getElementById("filterTeam");
  const teams = [...new Set(DATA.teams.map(row => row.team))].sort((a, b) => a.localeCompare(b));
  teamSelect.innerHTML = `<option value="Todos">Todas as seleções</option>` + teams.map(team => `<option value="${team}">${team}</option>`).join("");

  document.getElementById("filterCategory").addEventListener("change", event => {
    state.category = event.target.value;
    renderAll();
  });
  tournamentSelect.addEventListener("change", event => {
    state.tournament = event.target.value;
    renderAll();
  });
  teamSelect.addEventListener("change", event => {
    state.team = event.target.value;
    renderAll();
  });
}

function wireTabs() {
  document.querySelectorAll(".tab").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(item => item.classList.remove("active"));
      document.querySelectorAll(".view").forEach(item => item.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(`view-${button.dataset.tab}`).classList.add("active");
      setTimeout(() => Object.values(charts).forEach(item => item.resize()), 50);
    });
  });
}

async function init() {
  try {
    const response = await fetch("data/dashboard-data.json");
    DATA = await response.json();
    populateFilters();
    wireTabs();
    renderAll();
    window.addEventListener("resize", () => Object.values(charts).forEach(item => item.resize()));
  } catch (error) {
    document.body.innerHTML = `<div class="shell"><section class="panel"><h1>Erro ao carregar dados</h1><p>Abra o dashboard por um servidor local ou pelo GitHub Pages para permitir o carregamento de <code>data/dashboard-data.json</code>.</p><p>${error.message}</p></section></div>`;
  }
}

init();
