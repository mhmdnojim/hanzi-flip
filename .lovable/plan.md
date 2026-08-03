## Goal

Today a card is one *Chinese* sense. When a target language goes on the front, the card is clean only if that target word happens to map to exactly one Chinese sense. Target words that carry meanings with no Chinese anchor in the sheet are invisible, and target words spanning several Chinese senses are only distinguishable by their Chinese back side.

Fix: give the target languages their own sense identity in the workbook, then let the importer read it.

## Part 1 — Workbook format extension

Add three columns to **Reverse Index** (existing columns unchanged, so old workbooks still import):

| Column | Meaning |
| --- | --- |
| `Target Sense ID` | Stable per (language, main entry, meaning), e.g. `ES-tiempo-S02` |
| `Target Sense Gloss` | Short English gloss of *that target word's own* meaning |
| `Target Sense Note` | Optional disambiguator shown on the card (`(time, duration)`) |

Add one new sheet, **Target Sense Map**, listing every sense of every target word — including meanings with no Chinese counterpart:

```text
Language | Main Entry | Latin | Target Sense ID | Target Sense Gloss | Linked Sense IDs | Coverage
Spanish  | tiempo     |       | ES-tiempo-S01   | time, duration     | HSK1-W0012-S01   | linked
Spanish  | tiempo     |       | ES-tiempo-S02   | weather            |                  | unlinked
```

`Coverage` is `linked` (has at least one Chinese sense) or `unlinked` (target-only meaning). `Linked Sense IDs` is a `|`-separated list, so a target sense that legitimately covers several Chinese senses stays one card.

## Part 2 — Importer changes (`src/utils/senseWorkbook.ts`)

- Detect and read `Target Sense Map` when present; fall back to current behaviour when absent.
- Build the deck as before (one card per Chinese sense) **plus** an index keyed by target sense.
- When the front language is a target language, the card is chosen by `Target Sense ID`, not by Chinese row: back side = merged Chinese senses in `Linked Sense IDs` (commas kept, per your choice), disambiguator = `Target Sense Note`.
- `unlinked` target senses become cards with an empty Chinese side, tagged `Target-only` in `extraColumns` so they are visible and filterable rather than silently dropped.
- Latin transliteration continues to follow the entry, aligned per meaning as it is now.

## Part 3 — App surface (minimal)

- Card shows the sense note under the front word when present (no layout shift, same absolute positioning already used).
- Word list filter gains `Target-only` and `Needs review` toggles, reusing the existing filter chips.
- Import summary reports: Chinese senses, target senses, linked, target-only.

## Part 4 — Workbook generation

You regenerate HSK1–6 with the new columns. I'll provide a standalone script (`tools/add_target_senses.py`) that takes an existing workbook and produces the `Target Sense Map` sheet by grouping the Reverse Index by (Language, Main Entry) and assigning `Target Sense IDs` from the distinct Chinese senses it already links to. That gives you `linked` rows automatically; `unlinked` target-only meanings are appended manually or by a later AI pass.

## Technical notes

- No database or backend work; everything is client-side parsing plus the Python helper.
- Backwards compatible: workbooks without `Target Sense Map` import exactly as they do today.
- Sense IDs are stable strings, so per-word state (favorites, hidden meanings, scores) keyed by them survives re-import.
