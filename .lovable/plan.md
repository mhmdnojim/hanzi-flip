## The real problem

Your sheet has **one row per Chinese word**, and every other language column holds *all* translations of that word crammed into one cell. When you switch the front language to, say, Indonesian, the app has no way to know which of those comma-separated meanings belongs to which sense of the Chinese word — so unrelated synonyms show up on both sides. Ticking meanings card by card is patching symptoms.

The fix is structural: **one row = one meaning (one sense)**, not one row = one word.

## Target file structure

Instead of:

```text
Chinese | Pinyin | English                        | Indonesian
吧      | ba     | particle for polite suggestion, bar | partikel saran, bar
```

Split into sense rows:

```text
SenseID | Chinese | Pinyin | English                       | EN_Latin | Indonesian      | ID_Latin
吧-1    | 吧      | ba     | particle for polite suggestion | —        | partikel saran  | —
吧-2    | 吧      | ba     | bar (drinking place)           | —        | bar             | —
```

Rules for the cleaned file:
- Every language column contains **exactly one meaning** — no commas, semicolons, slashes.
- Each Latin/transliteration column sits immediately right of its language column and matches that single meaning.
- A `SenseID` column (`word-1`, `word-2`) keeps the senses of one word grouped and makes re-imports stable.
- Keep an optional `SenseNote` column (short English gloss) so you can tell senses apart at a glance while reviewing.

With that structure, whichever language you pick as the front language, the row already *is* one clean pair — no meaning checklist needed, no cross-language mismatch.

## How I'd do the conversion

1. You upload the current `.xlsx` here.
2. I run a one-off script that, for each row, splits the anchor column (the language you're studying — the front language) into its separate meanings, then asks the AI to redistribute every other language's meanings onto the correct sense row, using the anchor meaning plus the Chinese/English gloss as context.
3. Meanings the AI can't confidently attach to a sense are not deleted — they go into a `Unmatched` column at the far right so nothing is lost.
4. Transliteration columns are re-split and re-aligned to their sense.
5. I return a cleaned `.xlsx` plus a short report: rows in, sense rows out, how many cells were auto-split, how many landed in `Unmatched`.

Fixes are applied automatically; you review afterwards by scanning the `Unmatched` column and the `SenseNote` column rather than card by card.

## Note on anchor choice

You chose "anchor = current front language". Practically that means the cleaned file is optimal for one study direction at a time. If you later switch front language, the sense rows still hold — they only need re-splitting if the *new* front language had meanings that the anchor collapsed together. I'll flag those rows in the report so a second pass is cheap.

## What is not in scope

No changes to the app itself — no new AI cleanup button, no new schema, no backend work. This is a file-reorganization deliverable.

## To start

Upload the Excel file and tell me which language column should be the anchor for this pass (default: Chinese if you don't say otherwise).
