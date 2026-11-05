# openclaw-ledger

Minimal **token accounting for autonomous AI agents**. Your agent logs every work cycle; you see what the subscription is really burning. Zero dependencies, plain markdown storage (human + machine readable).

## Why
Agents on coding plans (GLM Lite, Claude, etc.) burn a fixed token budget. `openclaw-ledger` turns that into a ledger any agent can maintain with one command — and any human can read in GitHub.

## Install
    npm i -g openclaw-ledger

## Use
    openclaw-ledger add --cycle "fix login bug" --tools "edit,exec" --in 18k --out 1.2k
    openclaw-ledger summary              # totals + per-day
    openclaw-ledger summary --date 2026-11-05
    openclaw-ledger last

Data lives in a markdown pipe table (`ledger.md` by default, override with `--file`).

## License
MIT
