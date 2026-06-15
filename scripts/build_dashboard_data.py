import csv
import json
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data" / "curated"
OUT = ROOT / "data" / "dashboard-data.json"


COUNTRY_ALIASES = {
    "West Germany": "Germany",
    "Korea, Japan": "South Korea / Japan",
    "Australia, New Zealand": "Australia / New Zealand",
}


def read_csv(name):
    path = DATA_DIR / name
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def yes(value):
    return str(value).strip().upper() == "TRUE"


def num(value, default=0):
    if value is None or value == "":
        return default
    try:
        return int(float(value))
    except ValueError:
        return default


def flt(value, default=0.0):
    if value is None or value == "":
        return default
    try:
        return float(value)
    except ValueError:
        return default


def clean_country(name):
    return COUNTRY_ALIASES.get(name, name)


def person_name(row):
    given = row.get("given_name", "").strip()
    family = row.get("family_name", "").strip()
    return " ".join(part for part in [given, family] if part).strip() or "Unknown"


def category(row):
    return "Feminina" if yes(row.get("women")) else "Masculina"


def stage_bucket(stage_name):
    stage = (stage_name or "").lower()
    if "final" == stage or stage.endswith(" final"):
        return "Final"
    if "semi" in stage:
        return "Semifinal"
    if "quarter" in stage:
        return "Quartas"
    if "round of 16" in stage or "first round" in stage:
        return "Oitavas"
    if "group" in stage:
        return "Fase de grupos"
    return "Outras fases"


def goal_minute_bucket(row):
    minute = num(row.get("minute_regulation"))
    stoppage = num(row.get("minute_stoppage"))
    if minute <= 15:
        return "0-15"
    if minute <= 30:
        return "16-30"
    if minute <= 45 and stoppage == 0:
        return "31-45"
    if minute <= 45 and stoppage > 0:
        return "45+"
    if minute <= 60:
        return "46-60"
    if minute <= 75:
        return "61-75"
    if minute <= 90 and stoppage == 0:
        return "76-90"
    return "90+"


def pct(part, total):
    return round(part / total * 100, 1) if total else 0


def build():
    tournaments = read_csv("tournaments_curated.csv")
    standings = read_csv("tournament_standings_curated.csv")
    matches = read_csv("matches_curated.csv")
    goals = read_csv("goals_curated.csv")
    bookings = read_csv("bookings_curated.csv")
    penalty_kicks = read_csv("penalty_kicks_curated.csv")
    teams = read_csv("teams_curated.csv")
    players = read_csv("players_curated.csv")
    player_apps = read_csv("player_appearances_curated.csv")
    team_apps = read_csv("team_appearances_curated.csv")
    substitutions = read_csv("substitutions_curated.csv")
    stadiums = read_csv("stadiums_curated.csv")
    managers = read_csv("managers_curated.csv")
    manager_apps = read_csv("manager_appearances_curated.csv")
    referees = read_csv("referees_curated.csv")
    referee_apps = read_csv("referee_appearances_curated.csv")
    awards = read_csv("award_winners_curated.csv")
    hosts = read_csv("host_countries_curated.csv")

    tournament_by_id = {row["tournament_id"]: row for row in tournaments}
    standings_by_tournament = defaultdict(list)
    for row in standings:
        standings_by_tournament[row["tournament_id"]].append(row)

    tournament_meta = {}
    for row in tournaments:
        tid = row["tournament_id"]
        ordered = sorted(
            standings_by_tournament.get(tid, []),
            key=lambda item: num(item.get("position"), 999),
        )
        champion = clean_country(ordered[0]["team_name"]) if ordered else ""
        runner_up = clean_country(ordered[1]["team_name"]) if len(ordered) > 1 else ""
        tournament_meta[tid] = {
            "id": tid,
            "name": row["tournament_name"],
            "year": num(row["year"]),
            "category": category(row),
            "host": clean_country(row["host_country"]),
            "host_raw": row["host_country"],
            "host_won": yes(row["host_won"]),
            "teams": num(row["count_teams"]),
            "champion": champion,
            "runner_up": runner_up,
        }

    slim_matches = []
    for row in matches:
        tid = row["tournament_id"]
        meta = tournament_meta[tid]
        home_score = num(row.get("home_team_score"))
        away_score = num(row.get("away_team_score"))
        margin = abs(home_score - away_score)
        total_goals = home_score + away_score
        slim_matches.append(
            {
                "id": row["match_id"],
                "tournament_id": tid,
                "tournament": meta["name"],
                "year": meta["year"],
                "category": meta["category"],
                "host": meta["host"],
                "date": row.get("match_date", ""),
                "stage": row.get("stage_name", ""),
                "stage_bucket": stage_bucket(row.get("stage_name", "")),
                "group": row.get("group_name", ""),
                "match": row.get("match_name", ""),
                "home": clean_country(row.get("home_team_name", "")),
                "away": clean_country(row.get("away_team_name", "")),
                "score": row.get("score", ""),
                "home_score": home_score,
                "away_score": away_score,
                "goals": total_goals,
                "margin": margin,
                "extra_time": yes(row.get("extra_time")),
                "shootout": yes(row.get("penalty_shootout")),
                "stadium": row.get("stadium_name", ""),
                "city": row.get("city_name", ""),
                "country": clean_country(row.get("country_name", "")),
            }
        )

    match_by_id = {row["id"]: row for row in slim_matches}

    goals_slim = []
    for row in goals:
        match = match_by_id.get(row["match_id"])
        if not match:
            continue
        goals_slim.append(
            {
                "tournament_id": row["tournament_id"],
                "year": match["year"],
                "category": match["category"],
                "match_id": row["match_id"],
                "team": clean_country(row.get("team_name", "")),
                "player": person_name(row),
                "minute": row.get("minute_label", ""),
                "bucket": goal_minute_bucket(row),
                "own_goal": yes(row.get("own_goal")),
                "penalty": yes(row.get("penalty")),
                "stage_bucket": match["stage_bucket"],
            }
        )

    team_metrics = defaultdict(lambda: {
        "team": "",
        "category": "",
        "tournaments": set(),
        "matches": 0,
        "wins": 0,
        "draws": 0,
        "losses": 0,
        "goals_for": 0,
        "goals_against": 0,
        "titles": 0,
        "runner_up": 0,
        "finals": 0,
        "shootouts": 0,
        "cards": 0,
    })
    for row in team_apps:
        tid = row["tournament_id"]
        meta = tournament_meta[tid]
        team = clean_country(row["team_name"])
        key = (meta["category"], team)
        item = team_metrics[key]
        item["team"] = team
        item["category"] = meta["category"]
        item["tournaments"].add(tid)
        item["matches"] += 1
        item["wins"] += num(row.get("win"))
        item["draws"] += num(row.get("draw"))
        item["losses"] += num(row.get("lose"))
        item["goals_for"] += num(row.get("goals_for"))
        item["goals_against"] += num(row.get("goals_against"))
        item["shootouts"] += 1 if yes(row.get("penalty_shootout")) else 0

    for meta in tournament_meta.values():
        for label, field in [(meta["champion"], "titles"), (meta["runner_up"], "runner_up")]:
            if not label:
                continue
            key = (meta["category"], label)
            team_metrics[key]["team"] = label
            team_metrics[key]["category"] = meta["category"]
            team_metrics[key][field] += 1
            team_metrics[key]["finals"] += 1

    for row in bookings:
        meta = tournament_meta[row["tournament_id"]]
        team = clean_country(row.get("team_name", ""))
        key = (meta["category"], team)
        team_metrics[key]["cards"] += num(row.get("yellow_card")) + num(row.get("red_card")) + num(row.get("second_yellow_card"))

    teams_ranked = []
    for item in team_metrics.values():
        matches_count = item["matches"]
        teams_ranked.append(
            {
                "team": item["team"],
                "category": item["category"],
                "tournaments": len(item["tournaments"]),
                "matches": matches_count,
                "wins": item["wins"],
                "draws": item["draws"],
                "losses": item["losses"],
                "goals_for": item["goals_for"],
                "goals_against": item["goals_against"],
                "goal_diff": item["goals_for"] - item["goals_against"],
                "titles": item["titles"],
                "runner_up": item["runner_up"],
                "finals": item["finals"],
                "win_rate": pct(item["wins"], matches_count),
                "goals_per_match": round(item["goals_for"] / matches_count, 2) if matches_count else 0,
                "cards": item["cards"],
            }
        )
    teams_ranked.sort(key=lambda x: (-x["titles"], -x["finals"], -x["wins"], x["team"]))

    tournament_rows = []
    for meta in sorted(tournament_meta.values(), key=lambda x: x["year"]):
        tid = meta["id"]
        tournament_matches = [m for m in slim_matches if m["tournament_id"] == tid]
        tournament_goals = [g for g in goals_slim if g["tournament_id"] == tid]
        tournament_cards = [b for b in bookings if b["tournament_id"] == tid]
        tournament_subs = [s for s in substitutions if s["tournament_id"] == tid]
        tournament_penalties = [p for p in penalty_kicks if p["tournament_id"] == tid]
        final_match = next((m for m in tournament_matches if m["stage"].lower() == "final"), None)
        drama = (
            sum(1 for m in tournament_matches if m["margin"] <= 1 and m["stage_bucket"] != "Fase de grupos") * 4
            + sum(1 for m in tournament_matches if m["shootout"]) * 7
            + sum(1 for m in tournament_matches if m["extra_time"]) * 3
            + sum(1 for m in tournament_matches if m["goals"] >= 5) * 2
        )
        dominance = max(
            [
                t["goal_diff"]
                for t in teams_ranked
                if t["category"] == meta["category"] and meta["id"] in team_metrics[(meta["category"], t["team"])]["tournaments"]
            ]
            or [0]
        )
        tournament_rows.append(
            {
                **meta,
                "matches": len(tournament_matches),
                "goals": len(tournament_goals),
                "goals_per_match": round(len(tournament_goals) / len(tournament_matches), 2) if tournament_matches else 0,
                "cards": len(tournament_cards),
                "cards_per_match": round(len(tournament_cards) / len(tournament_matches), 2) if tournament_matches else 0,
                "substitutions": len(tournament_subs),
                "subs_per_match": round(len(tournament_subs) / len(tournament_matches), 2) if tournament_matches else 0,
                "shootouts": sum(1 for m in tournament_matches if m["shootout"]),
                "extra_time": sum(1 for m in tournament_matches if m["extra_time"]),
                "penalty_kicks": len(tournament_penalties),
                "drama_index": drama,
                "dominance_index": dominance,
                "final_match": final_match["match"] if final_match else "Final round",
                "final_score": final_match["score"] if final_match else "",
            }
        )

    scorers = Counter()
    scorer_team = {}
    scorer_category = {}
    penalty_goals = Counter()
    for row in goals_slim:
        if row["own_goal"]:
            continue
        key = (row["category"], row["player"], row["team"])
        scorers[key] += 1
        scorer_team[key] = row["team"]
        scorer_category[key] = row["category"]
        if row["penalty"]:
            penalty_goals[key] += 1
    top_scorers = [
        {
            "category": cat,
            "player": player,
            "team": team,
            "goals": goals_count,
            "penalties": penalty_goals[(cat, player, team)],
        }
        for (cat, player, team), goals_count in scorers.items()
    ]
    top_scorers.sort(key=lambda x: (-x["goals"], x["player"]))

    appearance_counter = Counter()
    starter_counter = Counter()
    player_country = {}
    player_category = {}
    player_tournaments = defaultdict(set)
    for row in player_apps:
        meta = tournament_meta[row["tournament_id"]]
        player = person_name(row)
        key = (meta["category"], player, clean_country(row["team_name"]))
        appearance_counter[key] += 1
        starter_counter[key] += num(row.get("starter"))
        player_country[key] = clean_country(row["team_name"])
        player_category[key] = meta["category"]
        player_tournaments[key].add(row["tournament_id"])
    player_impact = []
    for key, apps in appearance_counter.items():
        cat, player, team = key
        player_impact.append(
            {
                "category": cat,
                "player": player,
                "team": team,
                "appearances": apps,
                "starts": starter_counter[key],
                "tournaments": len(player_tournaments[key]),
                "goals": scorers.get(key, 0),
                "impact_score": apps + starter_counter[key] * 0.5 + scorers.get(key, 0) * 3 + len(player_tournaments[key]) * 2,
            }
        )
    player_impact.sort(key=lambda x: (-x["impact_score"], -x["goals"], x["player"]))

    stage_goals = Counter()
    minute_goals = Counter()
    for row in goals_slim:
        if not row["own_goal"]:
            stage_goals[(row["category"], row["stage_bucket"])] += 1
            minute_goals[(row["category"], row["bucket"])] += 1

    booking_rows = []
    cards_by_tournament = Counter()
    reds_by_tournament = Counter()
    for row in bookings:
        tid = row["tournament_id"]
        meta = tournament_meta[tid]
        cards_by_tournament[tid] += 1
        reds_by_tournament[tid] += num(row.get("red_card")) + num(row.get("second_yellow_card"))
    for meta in tournament_meta.values():
        booking_rows.append(
            {
                "tournament_id": meta["id"],
                "year": meta["year"],
                "category": meta["category"],
                "name": meta["name"],
                "cards": cards_by_tournament[meta["id"]],
                "reds": reds_by_tournament[meta["id"]],
            }
        )

    stadium_counter = Counter()
    stadium_country = {}
    stadium_city = {}
    for row in slim_matches:
        if not row["stadium"]:
            continue
        key = row["stadium"]
        stadium_counter[key] += 1
        stadium_country[key] = row["country"]
        stadium_city[key] = row["city"]
    top_stadiums = [
        {"stadium": key, "city": stadium_city[key], "country": stadium_country[key], "matches": count}
        for key, count in stadium_counter.most_common(20)
    ]

    host_rows = []
    for row in hosts:
        meta = tournament_meta[row["tournament_id"]]
        host_rows.append(
            {
                "year": meta["year"],
                "category": meta["category"],
                "host": clean_country(row["team_name"]),
                "progress": row.get("progress", ""),
                "host_won": meta["host_won"],
                "champion": meta["champion"],
            }
        )

    manager_counter = Counter()
    for row in manager_apps:
        meta = tournament_meta[row["tournament_id"]]
        manager_counter[(meta["category"], person_name(row), row.get("country_name", ""))] += 1
    top_managers = [
        {"category": cat, "manager": manager, "country": country, "matches": count}
        for (cat, manager, country), count in manager_counter.most_common(20)
    ]

    referee_counter = Counter()
    for row in referee_apps:
        meta = tournament_meta[row["tournament_id"]]
        referee_counter[(meta["category"], person_name(row), row.get("country_name", ""), row.get("confederation_code", ""))] += 1
    top_referees = [
        {"category": cat, "referee": referee, "country": country, "confederation": conf, "matches": count}
        for (cat, referee, country, conf), count in referee_counter.most_common(20)
    ]

    finals = []
    for meta in tournament_meta.values():
        finals.append(
            {
                "year": meta["year"],
                "category": meta["category"],
                "tournament": meta["name"],
                "match": next((m["match"] for m in slim_matches if m["tournament_id"] == meta["id"] and m["stage"].lower() == "final"), "Final round"),
                "score": next((m["score"] for m in slim_matches if m["tournament_id"] == meta["id"] and m["stage"].lower() == "final"), ""),
                "champion": meta["champion"],
                "runner_up": meta["runner_up"],
                "host": meta["host"],
                "host_won": meta["host_won"],
            }
        )
    finals.sort(key=lambda x: x["year"])

    biggest_matches = sorted(slim_matches, key=lambda x: (-x["margin"], -x["goals"], x["year"]))[:40]
    dramatic_matches = sorted(
        slim_matches,
        key=lambda x: (-(x["shootout"] * 8 + x["extra_time"] * 4 + (x["margin"] <= 1) * 3 + x["goals"]), x["year"]),
    )[:40]

    narrative = {
        "most_goals": max(tournament_rows, key=lambda x: x["goals"]),
        "highest_avg": max(tournament_rows, key=lambda x: x["goals_per_match"]),
        "most_drama": max(tournament_rows, key=lambda x: x["drama_index"]),
        "most_cards": max(tournament_rows, key=lambda x: x["cards"]),
        "top_scorer": top_scorers[0],
        "top_team": teams_ranked[0],
        "host_titles": sum(1 for row in tournament_rows if row["host_won"]),
    }

    payload = {
        "meta": {
            "generated_from": "data/curated/*_curated.csv",
            "tournaments": len(tournament_rows),
            "men_tournaments": sum(1 for row in tournament_rows if row["category"] == "Masculina"),
            "women_tournaments": sum(1 for row in tournament_rows if row["category"] == "Feminina"),
            "matches": len(slim_matches),
            "goals": len(goals_slim),
            "teams": len(teams),
            "players": len(players),
            "player_appearances": len(player_apps),
            "substitutions": len(substitutions),
            "bookings": len(bookings),
            "stadiums": len(stadiums),
            "managers": len(managers),
            "referees": len(referees),
            "awards": len(awards),
            "year_min": min(row["year"] for row in tournament_rows),
            "year_max": max(row["year"] for row in tournament_rows),
        },
        "tournaments": tournament_rows,
        "teams": teams_ranked,
        "scorers": top_scorers[:100],
        "players": player_impact[:100],
        "matches": slim_matches,
        "biggest_matches": biggest_matches,
        "dramatic_matches": dramatic_matches,
        "finals": finals,
        "bookings": booking_rows,
        "stadiums": top_stadiums,
        "hosts": host_rows,
        "managers": top_managers,
        "referees": top_referees,
        "stage_goals": [
            {"category": cat, "stage": stage, "goals": count}
            for (cat, stage), count in stage_goals.items()
        ],
        "minute_goals": [
            {"category": cat, "bucket": bucket, "goals": count}
            for (cat, bucket), count in minute_goals.items()
        ],
        "narrative": narrative,
    }

    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)} with {OUT.stat().st_size:,} bytes")


if __name__ == "__main__":
    build()
