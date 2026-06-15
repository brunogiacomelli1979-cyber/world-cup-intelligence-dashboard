import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CURATED = ROOT / "data" / "curated"
DASHBOARD = ROOT / "data" / "dashboard-data.json"


def read_csv(name):
    with (CURATED / name).open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def fail(message):
    raise SystemExit(f"VALIDATION FAILED: {message}")


def main():
    payload = json.loads(DASHBOARD.read_text(encoding="utf-8"))
    tournaments = read_csv("tournaments_curated.csv")
    matches = read_csv("matches_curated.csv")
    goals = read_csv("goals_curated.csv")
    team_apps = read_csv("team_appearances_curated.csv")

    if payload["meta"]["tournaments"] != len(tournaments):
        fail("dashboard tournament count does not match source")
    if payload["meta"]["matches"] != len(matches):
        fail("dashboard match count does not match source")
    if payload["meta"]["goals"] != len(goals):
        fail("dashboard goal count does not match source")
    if payload["meta"]["year_min"] != 1930 or payload["meta"]["year_max"] != 2023:
        fail("expected coverage from 1930 through 2023")
    if payload["meta"]["women_tournaments"] != 9:
        fail("expected 9 women's tournaments")
    if payload["meta"]["men_tournaments"] != 22:
        fail("expected 22 men's tournaments")

    source_match_ids = {row["match_id"] for row in matches}
    goal_match_ids = {row["match_id"] for row in goals}
    if missing := sorted(goal_match_ids - source_match_ids):
        fail(f"goals reference missing matches: {missing[:5]}")

    source_tournament_ids = {row["tournament_id"] for row in tournaments}
    app_tournament_ids = {row["tournament_id"] for row in team_apps}
    if missing := sorted(app_tournament_ids - source_tournament_ids):
        fail(f"team appearances reference missing tournaments: {missing[:5]}")

    by_tournament_goals = {}
    for row in payload["tournaments"]:
        by_tournament_goals[row["name"]] = row["goals"]
    if by_tournament_goals.get("2022 FIFA Men's World Cup") != 172:
        fail("2022 men's goal total should be 172")
    if by_tournament_goals.get("2023 FIFA Women's World Cup") != 164:
        fail("2023 women's goal total should be 164")

    red_cards = sum(row.get("reds", 0) for row in payload["bookings"])
    second_yellows = sum(row.get("second_yellows", 0) for row in payload["bookings"])
    if red_cards != 106:
        fail(f"expected 106 direct red cards, got {red_cards}")
    if second_yellows != 72:
        fail(f"expected 72 second-yellow dismissals, got {second_yellows}")

    required_keys = ["tournaments", "teams", "scorers", "players", "biggest_matches", "dramatic_matches", "finals"]
    for key in required_keys:
        if not payload.get(key):
            fail(f"dashboard payload missing non-empty {key}")

    print("Validation passed")


if __name__ == "__main__":
    main()
