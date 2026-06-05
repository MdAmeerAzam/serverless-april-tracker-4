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
    
    try {
        const creds = require(path.join(process.cwd(), 'credentials.json'));
        const auth = new JWT({
            email: creds.client_email,
            key: creds.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'],
        });

        const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
        await doc.loadInfo();

        const tables = [];
        for (const a of ASSETS) {
            for (const m of MARKETS) {
                for (const i of INTERVALS) {
                    tables.push(`curr_${a}_${m}_${i}`);
                }
            }
        }

        // PHASE 1: Fetch maxTimestamps
        const sheetTimestamps = {};
        for (const tableName of tables) {
            const sheet = doc.sheetsByTitle[tableName];
            let maxTimestamp = 0;
            if (sheet) {
                try {
                    const rows = await sheet.getRows();
                    if (rows.length > 0) {
                        maxTimestamp = Number(rows[rows.length - 1].get('timestamp'));
                    }
                } catch(e){}
            }
            sheetTimestamps[tableName] = maxTimestamp;
        }

        // PHASE 2: PostgreSQL query
        const dbRowsToAppend = {};
        const client = await pool.connect();
        try {
            for (const tableName of tables) {
                const maxTimestamp = sheetTimestamps[tableName] || 0;
                const { rows: pgRows } = await client.query(
                    `SELECT * FROM ${tableName} WHERE timestamp >= $1 ORDER BY timestamp ASC`,
                    [maxTimestamp]
                );
                dbRowsToAppend[tableName] = pgRows;
            }
        } finally {
            client.release();
            await pool.end(); // completely sever connection
        }

        // PHASE 3: Write to Google Sheets
        for (const tableName of tables) {
            const sheet = doc.sheetsByTitle[tableName];
            if (!sheet) {
                console.error(`  ✖ [Missing Tab] ${tableName}`);
                continue;
            }

            const pgRows = dbRowsToAppend[tableName];
            if (!pgRows || pgRows.length === 0) {
                console.log(`  ✔ [Clean] ${tableName}: Up to date`);
                continue;
            }

            const toAppend = pgRows.map(r => ({
                id:         r.id,
                timestamp:  r.timestamp,
                date:       new Date(Number(r.timestamp)).toISOString(),
                open:       r.open,
                high:       r.high,
                low:        r.low,
                sar1:       r.sar1,
                sar2:       r.sar2,
                sar3:       r.sar3,
                closeValue: r.closevalue,
                closePts:   r.closepts,
                closePct:   r.closepct,
                closeVol:   r.closevol
            }));

            const maxTimestamp = sheetTimestamps[tableName] || 0;
            if (maxTimestamp > 0 && toAppend.length > 0 && Number(toAppend[0].timestamp) === maxTimestamp) {
                const lastRow = (await sheet.getRows()).pop();
                Object.assign(lastRow, toAppend[0]);
                await lastRow.save();
                toAppend.shift();
            }

            if (toAppend.length > 0) {
                await sheet.addRows(toAppend);
                console.log(`  ✔ [Back-up] ${tableName}: ${toAppend.length} rows pushed`);
            }
            await new Promise(res => setTimeout(res, 1100)); // Rate limiting pacing
        }
    } catch (e) {
        console.error("[Fatal] Backup failed:", e.message);
    } finally {
        process.exit(0);
    }
}

backup();
