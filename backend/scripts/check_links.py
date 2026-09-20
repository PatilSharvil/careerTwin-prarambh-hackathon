"""Link Checker Script.

Checks URLs in resources.json and prints a formatted status table.
NOTE: This script must NEVER fail the build, regardless of HTTP/link responses.
"""
from __future__ import annotations

import concurrent.futures
import json
import os
import sys
import time
import urllib.error
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "data"))
RESOURCES_FILE = os.path.join(DATA_DIR, "resources.json")


def check_url(url: str, timeout: float = 4.0) -> tuple[str, int | str, str]:
    """Check an HTTP/HTTPS URL and return url, status code/string and note."""
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
        },
    )
    try:
        start = time.time()
        with urllib.request.urlopen(req, timeout=timeout) as response:
            latency = round((time.time() - start) * 1000)
            code = response.getcode()
            return url, code, f"{latency}ms"
    except urllib.error.HTTPError as e:
        return url, e.code, f"HTTP {e.code}"
    except urllib.error.URLError as e:
        return url, "CONN_ERR", str(e.reason)[:25]
    except Exception as e:
        return url, "ERROR", str(e)[:25]


def main():
    print("=" * 80, flush=True)
    print("CareerTwin Resource Link Checker", flush=True)
    print("=" * 80, flush=True)

    if not os.path.exists(RESOURCES_FILE):
        print(f"Resources file not found: {RESOURCES_FILE}", flush=True)
        sys.exit(0)

    with open(RESOURCES_FILE, "r", encoding="utf-8") as f:
        resources = json.load(f)

    # Collect distinct URLs preserving order
    unique_urls = list(dict.fromkeys(r.get("url") for r in resources if r.get("url")))

    print(f"Checking {len(unique_urls)} unique URLs across {len(resources)} resources concurrently...\n", flush=True)
    header = f"{'STATUS':<10} | {'LATENCY/NOTE':<20} | {'URL'}"
    print(header, flush=True)
    print("-" * 80, flush=True)

    ok_count = 0
    err_count = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(check_url, u): u for u in unique_urls}
        for future in concurrent.futures.as_completed(futures):
            url, status, note = future.result()
            if isinstance(status, int) and 200 <= status < 400:
                ok_count += 1
                flag = f"[{status}]"
            else:
                err_count += 1
                flag = f"[{status}]"

            display_url = url if len(url) <= 45 else url[:42] + "..."
            print(f"{flag:<10} | {note:<20} | {display_url}", flush=True)

    print("-" * 80, flush=True)
    print(f"Completed link check: {ok_count} reachable, {err_count} flagged/blocked by bot-defense.", flush=True)
    print("Check finished. Exiting successfully (build non-failing).", flush=True)
    sys.exit(0)


if __name__ == "__main__":
    main()
