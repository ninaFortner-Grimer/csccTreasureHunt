#!/usr/bin/env node
/**
 * CSCC Treasure Hunt — QR Code Generator
 * Generates real QR code images for all checkpoints defined in qrcodes.json.
 *
 * QR payload format: CSCC:<id>:<secret>
 * Example: CSCC:QR-01:CSCC-LAB-7K2P
 *
 * Output: QR/<id>.png + QR/inventory.json + QR/print_sheet.html
 *
 * Usage: node generate_qr.js
 */

const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const QR_DATA_FILE = path.join(__dirname, 'backend', 'data', 'qrcodes.json');
const OUTPUT_DIR   = path.join(__dirname, 'QR');

async function main() {
    const qrCodes = JSON.parse(fs.readFileSync(QR_DATA_FILE, 'utf8'));

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    console.log(`Generating ${qrCodes.length} QR code images…\n`);

    const inventory = [];

    for (const qr of qrCodes) {
        const payload = `CSCC:${qr.id}:${qr.secret}`;
        const filename = `${qr.id}.png`;
        const outputPath = path.join(OUTPUT_DIR, filename);

        // Generate QR as a PNG buffer with high error correction
        await QRCode.toFile(outputPath, payload, {
            type: 'png',
            errorCorrectionLevel: 'H',
            width: 400,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF',
            },
        });

        inventory.push({
            id: qr.id,
            payload,
            clue: qr.clue,
            file: filename,
        });

        console.log(`  ✓  ${qr.id}  →  ${filename}`);
        console.log(`     Payload: ${payload}`);
        console.log(`     Clue:    ${qr.clue}`);
        console.log('');
    }

    // Write inventory JSON
    const inventoryPath = path.join(OUTPUT_DIR, 'inventory.json');
    fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));
    console.log(`\nInventory written: ${inventoryPath}`);

    // Generate print sheet HTML
    const printHtml = generatePrintSheet(inventory);
    const printPath = path.join(OUTPUT_DIR, 'print_sheet.html');
    fs.writeFileSync(printPath, printHtml);
    console.log(`Print sheet written: ${printPath}`);

    console.log('\n✅  All QR codes generated successfully.');
    console.log('\nTesting instructions:');
    console.log('  1. Open QR/print_sheet.html in a browser to preview all codes.');
    console.log('  2. Use your phone camera to scan each code — verify the app responds correctly.');
    console.log('  3. Print print_sheet.html from your browser (File → Print).');
    console.log('  4. Cut out the cards and place them at the physical locations listed below:');
    console.log('');
    for (const item of inventory) {
        console.log(`     ${item.id}: ${item.clue}`);
    }
}

function generatePrintSheet(inventory) {
    const cards = inventory.map(item => `
        <div class="qr-card">
            <div class="card-label">CSCC TREASURE HUNT — WELCOME DAY 2026</div>
            <div class="checkpoint-id">${item.id}</div>
            <img src="${item.id}.png" alt="QR code for ${item.id}" width="280" height="280">
            <div class="for-organizer">
                <div class="organizer-label">FOR ORGANIZER USE — DO NOT DISPLAY FACING PARTICIPANTS</div>
                <div class="clue-hint">Clue given to participants: "${item.clue}"</div>
                <div class="payload-hint">Payload: ${item.payload}</div>
            </div>
        </div>
    `).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>CSCC Treasure Hunt — QR Code Print Sheet</title>
<style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
  h1 { font-size: 1.2rem; color: #0A0F34; margin-bottom: 4px; }
  .subtitle { font-size: 0.85rem; color: #666; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
  .qr-card {
    background: #fff;
    border: 2px solid #0A0F34;
    border-radius: 8px;
    padding: 16px;
    text-align: center;
    page-break-inside: avoid;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  .card-label {
    font-size: 0.6rem;
    font-weight: bold;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 8px;
  }
  .checkpoint-id {
    font-size: 1.6rem;
    font-weight: bold;
    color: #0A0F34;
    margin-bottom: 10px;
    font-family: 'Space Grotesk', monospace;
  }
  .qr-card img { display: block; margin: 0 auto 10px; }
  .for-organizer {
    margin-top: 12px;
    padding: 10px;
    background: #fff3cd;
    border: 1px dashed #ffc107;
    border-radius: 4px;
    text-align: left;
  }
  .organizer-label {
    font-size: 0.6rem;
    font-weight: bold;
    color: #856404;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
  }
  .clue-hint {
    font-size: 0.75rem;
    color: #444;
    margin-bottom: 4px;
    font-style: italic;
  }
  .payload-hint {
    font-size: 0.65rem;
    color: #888;
    font-family: monospace;
  }
  @media print {
    body { background: white; padding: 0; }
    .grid { gap: 12px; }
    .subtitle { display: none; }
    .qr-card { border: 1px solid #000; box-shadow: none; }
  }
</style>
</head>
<body>
<h1>🏴‍☠️ CSCC Treasure Hunt — QR Code Print Sheet</h1>
<p class="subtitle">
  Print this page and cut out the individual QR cards.
  The yellow section at the bottom of each card is for organizers only — fold or hide it before placing the card at the checkpoint.
</p>
<div class="grid">
${cards}
</div>
</body>
</html>`;
}

main().catch(err => {
    console.error('Error generating QR codes:', err.message);
    process.exit(1);
});
