#!/usr/bin/env python3
"""Apply a SQL file to Supabase using either Management API or project SQL endpoint."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

DEFAULT_SQL_PATH = "/sql/v1"
DEFAULT_MGMT_API_BASE = "https://api.supabase.com"
USER_AGENT = "asfaltflyt-apply-supabase-schema/1.0"


def build_endpoint(base_url: str, sql_path: str) -> str:
    base = base_url.rstrip("/")
    if sql_path.startswith("http://") or sql_path.startswith("https://"):
        return sql_path
    return f"{base}/{sql_path.lstrip('/')}"


def extract_project_ref(supabase_url: str) -> str:
    try:
        hostname = urllib.parse.urlparse(supabase_url).hostname or ""
    except ValueError:
        hostname = ""

    if not hostname:
        return ""

    parts = hostname.split(".")
    if len(parts) < 3:
        return ""

    # Expected format for hosted Supabase projects: <project-ref>.supabase.co
    if parts[-2:] != ["supabase", "co"]:
        return ""
    return parts[0]


def read_sql_file(sql_file: Path) -> str:
    if not sql_file.exists():
        raise FileNotFoundError(f"SQL-fil finnes ikke: {sql_file}")
    sql = sql_file.read_text(encoding="utf-8").strip()
    if not sql:
        raise ValueError(f"SQL-fil er tom: {sql_file}")
    return sql


def _request_json(endpoint: str, headers: dict[str, str], payload: dict[str, str], timeout: int) -> str:
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(endpoint, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read().decode("utf-8", errors="replace").strip()


def apply_sql_via_project_endpoint(endpoint: str, api_key: str, sql: str, payload_key: str, timeout: int) -> None:
    headers = {
        "Content-Type": "application/json",
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "User-Agent": USER_AGENT,
    }

    payload_keys: list[str] = []
    for key in (payload_key, "query", "sql"):
        if key and key not in payload_keys:
            payload_keys.append(key)

    errors: list[str] = []
    for key in payload_keys:
        try:
            response_text = _request_json(endpoint, headers=headers, payload={key: sql}, timeout=timeout)
            if response_text:
                print(response_text)
            print(f"SQL-skjema kjørt via project endpoint med payload-felt '{key}'.")
            return
        except urllib.error.HTTPError as exc:
            response_text = exc.read().decode("utf-8", errors="replace").strip()
            errors.append(f"[{key}] HTTP {exc.code}: {response_text}")
        except urllib.error.URLError as exc:
            errors.append(f"[{key}] Nettverksfeil: {exc.reason}")

    joined_errors = "\n".join(errors) if errors else "Ukjent feil"
    if "requested path is invalid" in joined_errors:
        joined_errors += (
            "\nHint: SUPABASE_URL peker på prosjekt-URL, men endpointet finnes ikke der. "
            "Bruk Management API-token via SUPABASE_MANAGEMENT_TOKEN/SUPABASE_ACCESS_TOKEN "
            "eller overstyr SUPABASE_SQL_PATH/SUPABASE_SQL_ENDPOINT."
        )
    raise RuntimeError(f"Klarte ikke kjøre SQL mot {endpoint}.\n{joined_errors}")


def apply_sql_via_management_api(
    management_api_base: str,
    project_ref: str,
    management_token: str,
    sql: str,
    timeout: int,
) -> None:
    base = management_api_base.rstrip("/")
    endpoint = f"{base}/v1/projects/{project_ref}/database/query"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {management_token}",
        "User-Agent": USER_AGENT,
    }

    try:
        response_text = _request_json(endpoint, headers=headers, payload={"query": sql}, timeout=timeout)
        if response_text:
            print(response_text)
        print("SQL-skjema kjørt via Supabase Management API.")
    except urllib.error.HTTPError as exc:
        response_text = exc.read().decode("utf-8", errors="replace").strip()
        hint = ""
        if exc.code in (401, 403):
            hint = (
                "\nHint: Management API krever normalt PAT/OAuth-token "
                "(ikke project API key som f.eks. sb_secret_*)."
            )
        raise RuntimeError(
            f"Klarte ikke kjøre SQL mot Management API ({endpoint}).\n"
            f"HTTP {exc.code}: {response_text}{hint}"
        ) from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Nettverksfeil mot Management API ({endpoint}): {exc.reason}") from exc


def main() -> int:
    parser = argparse.ArgumentParser(description="Kjør et SQL-skjema mot Supabase.")
    parser.add_argument(
        "--sql-file",
        default="schema.sql",
        help="Sti til SQL-filen som skal kjøres (default: schema.sql).",
    )
    parser.add_argument(
        "--mode",
        choices=("auto", "management", "project"),
        default="auto",
        help="Velg kjøremodus: auto, management eller project (default: auto).",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=60,
        help="Timeout per API-kall i sekunder (default: 60).",
    )
    args = parser.parse_args()

    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    project_ref = os.getenv("SUPABASE_PROJECT_REF", "").strip() or extract_project_ref(supabase_url)
    management_token = (
        os.getenv("SUPABASE_ACCESS_TOKEN", "").strip()
        or os.getenv("SUPABASE_MANAGEMENT_TOKEN", "").strip()
        or os.getenv("SUPABASE_PAT", "").strip()
        or os.getenv("ACCESS_TOKEN", "").strip()
    )
    management_api_base = os.getenv("SUPABASE_MANAGEMENT_API_BASE", DEFAULT_MGMT_API_BASE).strip() or DEFAULT_MGMT_API_BASE

    secret_access_key = os.getenv("SUPABASE_SECRET_ACCESS_KEY", "").strip() or os.getenv("SUPABASE_API_SECRET_KEY", "").strip()
    public_access_key = os.getenv("SUPABASE_PUBLIC_ACCESS_KEY", "").strip() or os.getenv("SUPABASE_API_PUBLIC_KEY", "").strip()
    api_key = (
        secret_access_key
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        or os.getenv("SUPABASE_API_KEY", "").strip()
        or public_access_key
    )

    sql_path = os.getenv("SUPABASE_SQL_PATH", DEFAULT_SQL_PATH).strip() or DEFAULT_SQL_PATH
    sql_endpoint_override = os.getenv("SUPABASE_SQL_ENDPOINT", "").strip()
    payload_key = os.getenv("SUPABASE_SQL_PAYLOAD_KEY", "query").strip() or "query"

    sql = read_sql_file(Path(args.sql_file))

    if args.mode in ("auto", "management") and management_token:
        if not project_ref:
            print(
                "Mangler prosjekt-ref for Management API. Sett SUPABASE_PROJECT_REF eller gyldig SUPABASE_URL.",
                file=sys.stderr,
            )
            return 1
        apply_sql_via_management_api(
            management_api_base=management_api_base,
            project_ref=project_ref,
            management_token=management_token,
            sql=sql,
            timeout=args.timeout,
        )
        return 0

    if args.mode == "management":
        print(
            "Mangler Management API token: SUPABASE_ACCESS_TOKEN, SUPABASE_MANAGEMENT_TOKEN, "
            "SUPABASE_PAT eller ACCESS_TOKEN.",
            file=sys.stderr,
        )
        return 1

    if not supabase_url:
        print("Mangler secret: SUPABASE_URL", file=sys.stderr)
        return 1
    if not api_key:
        print(
            "Mangler API key secret: SUPABASE_SECRET_ACCESS_KEY, SUPABASE_API_SECRET_KEY, "
            "SUPABASE_SERVICE_ROLE_KEY, SUPABASE_API_KEY, SUPABASE_PUBLIC_ACCESS_KEY "
            "eller SUPABASE_API_PUBLIC_KEY",
            file=sys.stderr,
        )
        return 1
    if not secret_access_key and public_access_key:
        print(
            "Merk: bruker public API key. For schema-endringer anbefales secret key eller Management API token.",
            file=sys.stderr,
        )

    endpoint = sql_endpoint_override or build_endpoint(supabase_url, sql_path)
    apply_sql_via_project_endpoint(
        endpoint=endpoint,
        api_key=api_key,
        sql=sql,
        payload_key=payload_key,
        timeout=args.timeout,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
