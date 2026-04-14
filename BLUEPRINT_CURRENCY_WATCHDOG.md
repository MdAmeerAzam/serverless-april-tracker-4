# BLUEPRINT: Cloud Currency WATCHDOG (Serverless)

An autonomous monitoring agent dedicated to the `serverless-april-tracker-4` (Currency) build. It ensures 24/7 data continuity and mathematical parity across 42 high-precision currency tables.

## 1. Operating Terms
- **Engine:** `run_currency_watchdog.js`
- **Schedule:** Automated audit every **4 hours**.
- **Platform:** GitHub Actions (Ubuntu-Latest).
- **Notification:** Fails the GitHub Action on any detected anomaly, triggering a high-priority system alert.

## 2. Audit Heuristics (Heuristic Scans)

| Audit | Error Flag | Threshold |
|-------|------------|-----------|
| **Sync Gap Check** | `Late by X candles` | Triggers if the gap exceeds **1.5x** the timeframe (e.g. 1.5 days for Daily). |
| **Genesis Audit** | `Genesis missing` | Triggers if **SAR 1** is 0 (Anchor point corruption). |
| **Reset Consistency** | `Zero-Reset 3 violation` | Triggers if **SAR 3** is stored on a closed candle where it matches SAR 1. |
| **Algorithm Audit** | `Algorithm death` | Triggers if **SAR 2** flatlines at 0 for 7 consecutive candles. |

## 3. High-Precision Standard
The Watchdog uses a **0.000001** float epsilon to ensure that even the smallest decimal drift in your EUR/USD or USD/INR data is flagged for review.

---
*Created: April 14, 2026*
