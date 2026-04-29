#!/usr/bin/env python3
"""2級ガソリン問題を取得し、questions.jsonに追記する。"""

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
URL_TEMPLATE = BASE_URL + "/2G/{exam_code}/{n:02d}/{n:02d}.html"
CACHE_DIR = Path("cache/pages")
OUTPUT_PATH = Path("questions.json")
REQUEST_TIMEOUT = 30
SLEEP_MIN = 2.0
SLEEP_MAX = 3.0

# 既存データ(2024_10)に追記する対象
# 注: サイトのURLは 2024_04 / 2023_04 ではなく 2024_03 / 2023_03
TARGET_EXAMS = [
    {"label": "2024年4月", "exam_code": "2024_03"},
    {"label": "2023年10月", "exam_code": "2023_10"},
    {"label": "2023年4月", "exam_code": "2023_03"},
]


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


def fetch_with_cache(url: str, cache_file: Path) -> tuple[bytes, bool]:
    cache_file.parent.mkdir(parents=True, exist_ok=True)

    if cache_file.exists():
        return cache_file.read_bytes(), True

    res = session.get(url, timeout=REQUEST_TIMEOUT)
    res.raise_for_status()

    html_bytes = res.content
    cache_file.write_bytes(html_bytes)

    # サーバー負荷軽減のため、未キャッシュ取得時だけ2〜3秒待機
    wait_sec = random.uniform(SLEEP_MIN, SLEEP_MAX)
    time.sleep(wait_sec)

    return html_bytes, False


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
        item_input = tr.find("input", attrs={"name": "ITEM"})
        if not item_input:
            continue
        tds = tr.find_all("td")
        if len(tds) < 2:
            continue
        # 2列問題/3列問題の両方に対応するため、先頭の番号セル以外を連結
        text = normalize_text(" ".join(td.get_text(" ", strip=True) for td in tds[1:]))
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

        # 崩れたHTMLで「解説本文 + 関連リンク + 前の問題」が1つの要素に
        # 混在する場合があるため、ナビ文言より前だけ採用して打ち切る。
        if "前の問題" in text or "次の問題" in text:
            cut_pos = len(text)
            for marker in ("前の問題", "次の問題"):
                pos = text.find(marker)
                if pos >= 0:
                    cut_pos = min(cut_pos, pos)
            head_text = normalize_text(text[:cut_pos])
            if head_text:
                lines.append(head_text)
            break

        lines.append(text)

    explanation = "\n".join(lines).strip()
    if not explanation:
        raise ValueError("解説テキストが空でした")

    return explanation


def extract_exam_label(soup: BeautifulSoup, exam_code: str) -> str:
    title_node = soup.select_one("h3.title")
    if title_node:
        title_text = normalize_text(title_node.get_text(" ", strip=True))
        m = re.search(r"(\d{4}年\d{2}月)", title_text)
        if m:
            return m.group(1)
    return exam_code.replace("_", "年") + "月"


def parse_question(
    html: bytes,
    question_id: int,
    question_no: int,
    exam_code: str,
    request_label: str,
    url: str,
) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")

    box1 = soup.select_one("div.box1")
    if not box1:
        raise ValueError("問題エリア(box1)が見つかりませんでした")

    question_text = extract_question_text(box1)
    choices = extract_choices(box1)
    answer = extract_answer_index(box1)
    explanation = extract_explanation(soup)
    exam_label = extract_exam_label(soup, exam_code)

    return {
        "id": question_id,
        "exam_code": exam_code,
        "exam_label": exam_label,
        "requested_exam_label": request_label,
        "question_no": question_no,
        "question": question_text,
        "choices": choices,
        "answer": answer,
        "explanation": explanation,
        "source_url": url,
    }


def main() -> None:
    if OUTPUT_PATH.exists():
        all_items: list[dict[str, Any]] = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
    else:
        all_items = []

    existing_urls = {item.get("source_url") for item in all_items if item.get("source_url")}
    max_id = max((int(item.get("id", 0)) for item in all_items), default=0)
    next_id = max_id + 1

    print(f"[START] existing questions: {len(all_items)} (max id={max_id})")

    for exam in TARGET_EXAMS:
        label = exam["label"]
        exam_code = exam["exam_code"]
        year_added = 0
        year_cached = 0
        year_fetched = 0
        year_skipped = 0

        print(f"\n[YEAR START] {label} ({exam_code})")

        for qno in range(1, 41):
            url = URL_TEMPLATE.format(exam_code=exam_code, n=qno)
            if url in existing_urls:
                year_skipped += 1
                continue

            cache_file = CACHE_DIR / f"{exam_code}_{qno:02d}.html"
            html, is_cached = fetch_with_cache(url, cache_file)
            if is_cached:
                year_cached += 1
            else:
                year_fetched += 1

            item = parse_question(
                html=html,
                question_id=next_id,
                question_no=qno,
                exam_code=exam_code,
                request_label=label,
                url=url,
            )
            all_items.append(item)
            existing_urls.add(url)
            year_added += 1
            print(
                f"[OK] {label} Q{qno:02d} -> id={next_id} "
                f"({'cache' if is_cached else 'fetched'})"
            )
            next_id += 1

        print(
            "[YEAR DONE] "
            f"{label}: added={year_added}, skipped(existing)={year_skipped}, "
            f"cache-hit={year_cached}, fetched={year_fetched}"
        )

    OUTPUT_PATH.write_text(json.dumps(all_items, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n[DONE] total questions: {len(all_items)} -> {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
