# BLUEPRINT: Serverless April Tracker 4 (Cloud Currency & DXY)

This is a 100% standalone, serverless infrastructure designed for high-precision global currency tracking. It measures 7 major currency assets (Spot & Futures) with raw mathematical parity between TradingView and Supabase.

## 1. Core Infrastructure & Links

- **GitHub Repository:** [serverless-april-tracker-4](https://github.com/MdAmeerAzam/serverless-april-tracker-4)
- **Primary Database:** Supabase (PostgreSQL) - 42 High-Precision Tables.
- **Backup Spreadsheet:** [Cloud Currency Sheet](https://docs.google.com/spreadsheets/d/1rOWiPPq8YdpX8X5TDbeu5kfbc5INLgShtd-0RmaFAhk)
- **Data Engine:** Deep WebSocket Handshake with TradingView.

## 2. Operating Terms (15-Minute Cycle)

| Phase | Time (Minutes past hour) | Role |
|-------|--------------------------|------|
| **Sync** | 8, 23, 38, 53 | Pulls TradingView data into Supabase (12 decimals). |
| **Backup** | 13, 28, 43, 58 | Appends fresh rows to the [Google Sheet]. |
| **Watchdog** | Every 4 Hours (Min 18) | Audits the 42-table perimeter for anomalies. |

## 3. The Currency Matrix (7 Assets)

All charts are high-precision and calibrated with the **3-SAR Logic** (Zero-Reset Rule).

- **USD Standalone:** DXY (Dollar Index)
- **European:** EUR/USD
- **British:** GBP/USD
- **Japanese:** USD/JPY
- **Australian:** AUD/USD
- **Canadian:** USD/CAD
- **Indian:** USD/INR (Spot & NSE Futures)

## 4. End-to-End Troubleshooting

If you suspect a sync gap, use these terminal maintenance commands:

1.  **Row Audit (Check local sync status):**
    ```powershell
    cd "C:\Users\Ameer_Agent\Desktop\Antigravity\Serverless April Currency"
    node scripts/run_currency_watchdog.js
    ```
2.  **Manual Resync (Force pull fresh data):**
    ```powershell
    node scripts/run_currency_sync.js
    ```
3.  **Fresh Blueprint Backup:**
    ```powershell
    node scripts/run_currency_backup.js
    ```

## 5. Security & Dependencies
- **No Dependencies:** Tracker 4 is technically isolated. If Tracker 1, 2, or 3 are modified, this Currency build remains unaffected.
- **Precision:** Storage uses `DECIMAL(24, 12)` to ensure parity with TradingView down to the last decimal point.

---
*Created: April 14, 2026*
