# CHAPA learning pipeline

The production app learns immediately from every completed session through
`POST /api/coach/feedback`. This Python pipeline is the reproducible offline
trainer for larger, anonymized feedback exports.

```bash
python3 ml/train_coach.py feedback.jsonl --output ml/model.json
```

Each JSONL event may contain `mode`, `reward`, and a `checkIn` object with
`energy`, `sleepHours`, `soreness`, `stress`, and `availableMinutes`.

The resulting model contains transparent numerical weights. It does not modify
prompts, execute code, or bypass the safety thresholds used by the runtime.
