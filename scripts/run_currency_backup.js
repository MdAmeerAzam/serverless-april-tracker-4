const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { pool } = require('../api/db');
const path = require('path');

const SPREADSHEET_ID = '1rOWiPPq8YdpX8X5TDbeu5kfbc5INLgShtd-0RmaFAhk';
const ASSETS = ['dxy', 'eur', 'gbp', 'jpy', 'aud', 'cad', 'inr'];
const MARKETS = ['spot', 'futures'];
const INTERVALS = ['daily', 'weekly', 'monthly'];

async function backup() {
    console.log("[GitHub Actions] Starting High-Precision Currency Backup...");
    const client = await pool.connect();
    
    try {
        const creds = require(path.join(process.cwd(), 'credentials.json'));
        const auth = new JWT({
            email: creds.client_email,
            key: creds.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'],
        });

        const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
        await doc.loadInfo();

        for (const a of ASSETS) {
            for (const m of MARKETS) {
                for (const i of INTERVALS) {
                    const tableName = `curr_${a}_${m}_${i}`;
                    const sheet = doc.sheetsByTitle[tableName];
                    
                    if (!sheet) {
                        console.error(`  ✖ [Missing Tab] ${tableName}`);
                        continue;
                    }

                    let maxTimestamp = 0;
                    const rows = await sheet.getRows();
                    if (rows.length > 0) {
                        maxTimestamp = Number(rows[rows.length - 1].get('timestamp'));
                    }

                    const { rows: pgRows } = await client.query(`SELECT * FROM ${tableName} WHERE timestamp >= $1 ORDER BY timestamp ASC`, [maxTimestamp]);
                    
                    const toAppend = pgRows.map(r => ({
                        'Date / Time (Local)': new Date(Number(r.timestamp)).toLocaleString(),
                        'Date / Time (UTC)': new Date(Number(r.timestamp)).toISOString(),
                        timestamp: r.timestamp,
                        open: r.open,
                        high: r.high,
                        low: r.low,
                        '1-SAR': r.sar1,
                        '2-SAR': r.sar2,
                        '3-SAR INF': r.sar3,
                        close: r.closevalue,
                        Pts: r.closepts,
                        '%': r.closepct,
                        closeVol: r.closevol
                    }));

                    if (maxTimestamp > 0 && toAppend.length > 0 && Number(toAppend[0].timestamp) === maxTimestamp) {
                        const lastRow = (await sheet.getRows()).pop();
                        Object.assign(lastRow, toAppend[0]);
                        await lastRow.save();
                        toAppend.shift();
                    }

                    if (toAppend.length > 0) {
                        await sheet.addRows(toAppend);
                        console.log(`  ✔ [Back-up] ${tableName}: ${toAppend.length} rows pushed`);
                    } else {
                        console.log(`  ✔ [Clean] ${tableName}: Up to date`);
                    }

                    await new Promise(res => setTimeout(res, 1100)); // Rate limiting pacing
                }
            }
        }
    } catch (e) {
        console.error("[Fatal] Backup failed:", e.message);
    } finally {
        client.release();
        process.exit(0);
    }
}

backup();
