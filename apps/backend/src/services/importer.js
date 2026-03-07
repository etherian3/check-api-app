require('dotenv').config({ path: require('path').resolve(__dirname, '../../../../.env') });
const axios = require('axios');
const { query } = require('../db');

/**
 * Parses a markdown table row into fields.
 * Table format: | [Name](URL) | Description | Auth | HTTPS | CORS |
 */
function parseMarkdownTables(markdown) {
    const apis = [];
    let currentCategory = 'General';

    const lines = markdown.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Detect category headers (### Category Name)
        const categoryMatch = line.match(/^###\s+(.+)$/);
        if (categoryMatch) {
            currentCategory = categoryMatch[1].trim();
            continue;
        }

        // Skip separator lines and header rows
        if (line.startsWith('|:-') || line.startsWith('| :-') || line.startsWith('| --') ||
            line.includes('| API |') || line.includes('| Description |') ||
            !line.startsWith('|')) {
            continue;
        }

        // Parse data rows
        const cells = line.split('|').map(c => c.trim()).filter(Boolean);
        if (cells.length < 3) continue;

        // Extract API name and URL from markdown link: [Name](URL)
        const linkMatch = cells[0].match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (!linkMatch) continue;

        const name = linkMatch[1].trim();
        const url = linkMatch[2].trim();
        const description = cells[1] ? cells[1].trim() : '';
        const auth = cells[2] ? cells[2].replace(/`/g, '').trim() : 'No';
        const https = cells[3] ? cells[3].trim().toLowerCase() === 'yes' : true;

        // Validate URL
        try {
            new URL(url);
        } catch {
            continue;
        }

        // Skip GitHub URLs (those are docs, not API endpoints)
        if (name && url && !url.includes('github.com')) {
            apis.push({
                name,
                base_url: url,
                description,
                category: currentCategory,
                auth_required: auth,
                https_supported: https,
            });
        }
    }

    return apis;
}

async function importApis() {
    console.log('[Importer] Fetching API list from GitHub...');

    const response = await axios.get(
        'https://raw.githubusercontent.com/public-api-lists/public-api-lists/master/README.md',
        { timeout: 15000 }
    );

    const apis = parseMarkdownTables(response.data);
    console.log(`[Importer] Parsed ${apis.length} APIs from README`);

    let imported = 0;
    let skipped = 0;

    for (const api of apis) {
        try {
            const result = await query(
                `INSERT INTO apis (name, description, category, auth_required, https_supported, base_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (base_url) DO NOTHING
         RETURNING id`,
                [api.name, api.description, api.category, api.auth_required, api.https_supported, api.base_url]
            );
            if (result.rowCount > 0) {
                imported++;
            } else {
                skipped++;
            }
        } catch (err) {
            console.error(`[Importer] Failed to insert ${api.name}:`, err.message);
        }
    }

    console.log(`[Importer] Done. Imported: ${imported}, Skipped (duplicates): ${skipped}`);
    return { imported, skipped, total: apis.length };
}

module.exports = { importApis };
