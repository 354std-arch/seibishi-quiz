#!/usr/bin/env python3
"""2024年10月 2級ガソリン問題 (01-40) を取得して questions.json を作る。"""

from __future__ import annotations

import json
import random
import re
import time
from pathlib import Path
from typing import Any

import requests
from bs4 import BeautifulSoup
from bs4.element import NavigableString, Tag

BASE_URL = "https://jidoshaseibishi.com"
URL_TEMPLATE = BASE_URL + "/2G/2024_10/{n:02d}/{n:02d}.html"
CACHE_DIR = Path("cache/pages")
OUTPUT_PATH = Path("questions.json")
REQUEST_TIMEOUT = 30
SLEEP_MIN = 2.0
SLEEP_MAX = 3.0


session = requests.Session()
session.headers.update(
    {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        )
    }
)


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def fetch_with_cache(url: str, cache_file: Path) -> bytes:
    cache_file.parent.mkdir(parents=True, exist_ok=True)

    if cache_file.exists():
        return cache_file.read_bytes()

    res = session.get(url, timeout=REQUEST_TIMEOUT)
    res.raise_for_status()

    html_bytes = res.content
    cache_file.write_bytes(html_bytes)

    # サーバー負荷軽減のため、未キャッシュ取得時だけ2〜3秒待機
    wait_sec = random.uniform(SLEEP_MIN, SLEEP_MAX)
    time.sleep(wait_sec)

    return html_bytes


def extract_question_text(box1: Tag) -> str:
    for child in box1.children:
        if isinstance(child, Tag) and child.name == "form":
            break
        if isinstance(child, Tag) and child.name == "p":
            text = normalize_text(child.get_text(" ", strip=True))
            if text:
                return text
    raise ValueError("問題文を抽出できませんでした")


def extract_choices(box1: Tag) -> list[str]:
    form = box1.find("form")
    if not form:
        raise ValueError("選択肢フォームが見つかりませんでした")

    choices: list[str] = []
    for tr in form.select("tbody tr"):
        tds = tr.find_all("td")
        if len(tds) < 2:
            continue
        text = normalize_text(tds[1].get_text(" ", strip=True))
        if text:
            choices.append(text)

    if len(choices) != 4:
        raise ValueError(f"選択肢が4件ではありません: {len(choices)}件")

    return choices


def extract_answer_index(box1: Tag) -> int:
    select = box1.select_one("div.cp_ipselect select")
    if not select:
        raise ValueError("正解選択欄が見つかりませんでした")

    options = select.find_all("option")
    if len(options) < 2:
        raise ValueError("正解optionが見つかりませんでした")

    text = normalize_text(options[-1].get_text(" ", strip=True))
    m = re.search(r"\d+", text)
    if not m:
        raise ValueError(f"正解番号を解釈できませんでした: {text}")

    ans = int(m.group(0))
    if ans < 1 or ans > 4:
        raise ValueError(f"正解番号が範囲外です: {ans}")

    return ans


def extract_explanation(soup: BeautifulSoup) -> str:
    box5 = soup.select_one("div.box5")
    if not box5:
        raise ValueError("解説エリア(box5)が見つかりませんでした")

    heading = None
    for h in box5.find_all(["h2", "h3", "h4"]):
        if "解説" in h.get_text(" ", strip=True):
            heading = h
            break

    if not heading:
        heading = box5.select_one("h3.balloon, h2.balloon, h4.balloon")

    if not heading:
        raise ValueError("解説見出しが見つかりませんでした")

    lines: list[str] = []

    for node in heading.next_siblings:
        if isinstance(node, NavigableString):
            continue
        if not isinstance(node, Tag):
            continue

        if node.get("id") == "menu2":
            break

        if node.name in {"script", "style", "iframe"}:
            continue

        text = normalize_text(node.get_text(" ", strip=True))
        if not text:
            continue

        if "前の問題" in text or "次の問題" in text:
            break

        # 年度リンクなどの参照ブロックは解説から除外
        if node.find_all("a", href=True):
            hrefs = [a.get("href", "") for a in node.find_all("a", href=True)]
            if any("/2G/" in h for h in hrefs):
                continue

        lines.append(text)

    explanation = "\n".join(lines).strip()
    if not explanation:
        raise ValueError("解説テキストが空でした")

    return explanation


def parse_question(html: bytes, question_id: int, url: str) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")

    box1 = soup.select_one("div.box1")
    if not box1:
        raise ValueError("問題エリア(box1)が見つかりませんでした")

    question_text = extract_question_text(box1)
    choices = extract_choices(box1)
    answer = extract_answer_index(box1)
    explanation = extract_explanation(soup)

    return {
        "id": question_id,
        "question": question_text,
        "choices": choices,
        "answer": answer,
        "explanation": explanation,
        "source_url": url,
    }


def main() -> None:
    all_items: list[dict[str, Any]] = []

    for qid in range(1, 41):
        url = URL_TEMPLATE.format(n=qid)
        cache_file = CACHE_DIR / f"2024_10_{qid:02d}.html"

        html = fetch_with_cache(url, cache_file)
        item = parse_question(html, qid, url)
        all_items.append(item)
        print(f"[OK] {qid:02d} {url}")

    OUTPUT_PATH.write_text(
        json.dumps(all_items, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"\nSaved {len(all_items)} questions to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
