#!/usr/bin/env python3
"""Apply a SQL file to Supabase using URL + API key secrets."""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path


def build_endpoint(base_url: str, sql_path: str) -> str:
    base = base_url.rstrip("/")
    if sql_path.startswith("http://") or sql_path.startswith("https://"):
        return sql_path
    return f"{base}/{sql_path.lstrip('/')}"


def read_sql_file(sql_file: Path) -> str:
    if not sql_file.exists():
        raise FileNotFoundError(f"SQL-fil finnes ikke: {sql_file}")
    sql = sql_file.read_text(encoding="utf-8").strip()
    if not sql:
        raise ValueError(f"SQL-fil er tom: {sql_file}")
    return sql


def apply_sql(endpoint: str, api_key: str, sql: str, payload_key: str, timeout: int) -> None:
    headers = {
        "Content-Type": "application/json",
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
    }

    payload_keys: list[str] = []
    for key in (payload_key, "query", "sql"):
        if key and key not in payload_keys:
            payload_keys.append(key)

    errors: list[str] = []
    for key in payload_keys:
        body = json.dumps({key: sql}).encode("utf-8")
        request = urllib.request.Request(endpoint, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                response_text = response.read().decode("utf-8", errors="replace").strip()
                if response_text:
                    print(response_text)
                print(f"SQL-skjema kjørt via payload-felt '{key}'.")
                return
        except urllib.error.HTTPError as exc:
            response_text = exc.read().decode("utf-8", errors="replace")
            errors.append(f"[{key}] HTTP {exc.code}: {response_text.strip()}")
        except urllib.error.URLError as exc:
            errors.append(f"[{key}] Nettverksfeil: {exc.reason}")

    joined_errors = "\n".join(errors) if errors else "Ukjent feil"
    raise RuntimeError(f"Klarte ikke kjøre SQL mot {endpoint}.\n{joined_errors}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Kjør et SQL-skjema mot Supabase.")
    parser.add_argument(
        "--sql-file",
        default="schema.sql",
        help="Sti til SQL-filen som skal kjøres (default: schema.sql).",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=60,
        help="Timeout per API-kall i sekunder (default: 60).",
    )
    args = parser.parse_args()

    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    secret_access_key = os.getenv("SUPABASE_SECRET_ACCESS_KEY", "").strip()
    public_access_key = os.getenv("SUPABASE_PUBLIC_ACCESS_KEY", "").strip()
    api_key = (
        secret_access_key
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        or os.getenv("SUPABASE_API_KEY", "").strip()
        or public_access_key
    )
    sql_path = os.getenv("SUPABASE_SQL_PATH", "/sql/v1").strip() or "/sql/v1"
    payload_key = os.getenv("SUPABASE_SQL_PAYLOAD_KEY", "query").strip() or "query"

    if not supabase_url:
        print("Mangler secret: SUPABASE_URL", file=sys.stderr)
        return 1
    if not api_key:
        print(
            "Mangler API key secret: SUPABASE_SECRET_ACCESS_KEY, "
            "SUPABASE_SERVICE_ROLE_KEY, SUPABASE_API_KEY eller SUPABASE_PUBLIC_ACCESS_KEY",
            file=sys.stderr,
        )
        return 1
    if not secret_access_key and public_access_key:
        print(
            "Merk: bruker SUPABASE_PUBLIC_ACCESS_KEY. For schema-endringer anbefales SUPABASE_SECRET_ACCESS_KEY.",
            file=sys.stderr,
        )

    sql = read_sql_file(Path(args.sql_file))
    endpoint = build_endpoint(supabase_url, sql_path)
    apply_sql(endpoint=endpoint, api_key=api_key, sql=sql, payload_key=payload_key, timeout=args.timeout)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
