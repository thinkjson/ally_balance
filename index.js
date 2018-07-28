#!/usr/bin/env node
const { Chromeless } = require('chromeless');
const path = require('path');
const https = require('https');

async function run() {
    const chromeless = new Chromeless({
        launchChrome: true
    });

    // Ensure required environment variables are present
    const username = process.env.ALLY_BANK_USERNAME;
    const password = process.env.ALLY_BANK_PASSWORD;
    const event = process.env.IFTTT_ALLY_EVENT_NAME;
    const api_key = process.env.IFTTT_API_KEY;

    // Log into Ally Bank and grab account balances
    const balances = await chromeless
        .goto('https://www.ally.com/?context=bank')
        .click('#login-btn')
        .focus('#account')
        .type('b')
        .focus('#username')
        .type(username)
        .focus('#password')
        .type(password)
        .click('.login-box button')
        .wait('h3.accounts-group-header')
        .evaluate(() => {
            let balances = "";
            $('.account-card tbody tr').each((i, el) => { 
                balances += $(el).find('td').eq(1).text().trim().padStart(13) + 
                    "    " + $(el).find('span.is-bold').text() + "\n";
            });

            return balances;
        });

    // Prepare payload for IFTTT
    const postData = JSON.stringify({
        value1: balances
    });
    console.log(balances);

    // Fire off trigger for IFTTT
    const options = {
        method: 'POST',
        hostname: 'maker.ifttt.com',
        port: 443,
        path: `/trigger/${event}/with/key/${api_key}`,
        agent: false,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
    };
    const req = https.request(options, (res) => {
        console.log('statusCode:', res.statusCode);
        res.on('data', (d) => {
            process.stdout.write(d);
        });
        res.on('end', () => {
            process.stdout.write('\n');
        });
    });
    req.write(postData);
    req.on('error', (e) => {
        console.error(e);
    });
    req.end();

    await chromeless.end();
}

run().catch(console.error.bind(console));