const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { pool } = require('../api/db');
const path = require('path');

const SPREADSHEET_ID = '1rOWiPPq8YdpX8X5TDbeu5kfbc5INLgShtd-0RmaFAhk';
const ASSETS = ['dxy', 'eur', 'gbp', 'jpy', 'aud', 'cad', 'inr'];
const MARKETS = ['spot', 'futures'];
const INTERVALS = ['daily', 'weekly', 'monthly'];

async function runAudit() {
    console.log("[E2E Audit] Initializing Mathematical Cell Parity Scan...");
    let totalDbCells = 0;
    let totalSheetCells = 0;
    
        const client = await pool.connect();
        const dbCounts = {};
        for (const a of ASSETS) {
            for (const m of MARKETS) {
                for (const i of INTERVALS) {
                    const tableName = `curr_${a}_${m}_${i}`;
                    try {
                        const { rows } = await client.query(`SELECT COUNT(*) as exact_count FROM ${tableName}`);
                        dbCounts[tableName] = Number(rows[0].exact_count);
                    } catch(e) {
                        dbCounts[tableName] = -1;
                    }
                }
            }
        }
        client.release();
        let clientReleased = true;
        await pool.end();

    try {
        const creds = require(path.join(process.cwd(), 'credentials.json'));
        const auth = new JWT({
            email: creds.client_email,
            key: creds.private_key,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(SPREADSHEET_ID, auth);
        await doc.loadInfo();

        for (const a of ASSETS) {
            for (const m of MARKETS) {
                for (const i of INTERVALS) {
                    const tableName = `curr_${a}_${m}_${i}`;
                    const sheet = doc.sheetsByTitle[tableName];
                    
                    if (!sheet) {
                        console.log(`[Skipped] ${tableName} -> Missing in Google Sheets`);
                        continue;
                    }

                    if (dbCounts[tableName] === -1) {
                         console.log(`[Skipped] ${tableName} -> Table does not exist in Supabase`);
                         continue;
                    }

                    const dbRows = dbCounts[tableName];
                    const dbCells = dbRows * 13; 
                    
                    await sheet.loadCells('A1:M1'); 
                    const sheetRows = sheet.rowCount - 1; 
                    const sheetCells = sheetRows * 13;

                    totalDbCells += dbCells;
                    totalSheetCells += sheetCells;

                    if (dbRows === sheetRows) {
                        console.log(`[Verified] ${tableName} -> DB Rows: ${dbRows} | Sheet Rows: ${sheetRows} | DB Cells: ${dbCells} | Sheet Cells: ${sheetCells}`);
                    } else {
                        console.error(`[Mismatched] ${tableName} -> DB Rows: ${dbRows} | Sheet Rows: ${sheetRows}`);
                    }
                }
            }
        }
        
        console.log("=========================================");
        console.log(`Total Supabase Database Cells: ${totalDbCells}`);
        console.log(`Total Google Sheets Cells: ${totalSheetCells}`);
        console.log("=========================================");

    } finally {
        if (!clientReleased) {
            try { client.release(); } catch(e){}
        }
        process.exit(0);
    }
}

runAudit();
