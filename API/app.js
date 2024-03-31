const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

let finalResults = {};

// Helper functions
function createPayload(status, have, want, minimum) {
    return {
        query: {
            status: { option: status },
            have: have,
            want: want,
            minimum: minimum
        },
        sort: { have: "asc" },
        engine: "new"
    };
}

async function makeRequest(url, headers, payload) {
    try {
        const response = await axios.post(url, payload, { headers: headers });
        console.log('Request was successful.');
        return response.data;
    } catch (error) {
        console.error('Request failed.');
        console.error('Status code:', error.response.status);
        console.error('Response body:', error.response.data);
        return null;
    }
}

function calculatePrice(responseData, countLimit) {
    if (!responseData) {
        return 0;
    }
    let resultCount = 0;
    for (const [id, data] of Object.entries(responseData.result || {})) {
        if (data.listing && data.listing.offers) {
            const exchangeAmount = data.listing.offers[0].exchange.amount;
            const itemAmount = data.listing.offers[0].item.amount;
            resultCount += 1;
            if (resultCount === countLimit) {
                return exchangeAmount / itemAmount;
            }
        }
    }
    return 0;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Data processing
async function dataProcess(){
    const url = 'https://www.pathofexile.com/api/trade/exchange/Necropolis';
    const headers = {
        'Content-Type': 'application/json',
        'Cookie': '',
        'User-Agent': 'your-user-agent'
    };

    // Create payloads
    const currencyPayload = createPayload("online", ["chaos"], ["divine"], 1);
    const bulkPayloadScreaming = createPayload("online", ["divine"], ["screaming-invitation"], 10);
    const bulkPayloadIncandescent = createPayload("online", ["divine"], ["incandescent-invitation"], 10);
    const bulkPayloadMaven = createPayload("online", ["divine"], ["the-mavens-writ"], 10);
    const singlePayloadScreaming = createPayload("online", ["chaos"], ["screaming-invitation"], 1);
    const singlePayloadIncandescent = createPayload("online", ["chaos"], ["incandescent-invitation"], 1);
    const singlePayloadMaven = createPayload("online", ["chaos"], ["the-mavens-writ"], 1);

    // Make requests with delays to prevent rate limiting
    const currencyResponseData = await makeRequest(url, headers, currencyPayload);
    await sleep(2000); // Wait for 3 second

    const bulkResponseDataScreaming = await makeRequest(url, headers, bulkPayloadScreaming);
    await sleep(2000); // Wait for 3 second

    const bulkResponseDataIncandescent = await makeRequest(url, headers, bulkPayloadIncandescent);
    await sleep(2500); // Wait for 3.5 second

    const bulkResponseDataMaven = await makeRequest(url, headers, bulkPayloadMaven);
    await sleep(2500); // Wait for 3.5 second

    const singleResponseDataScreaming = await makeRequest(url, headers, singlePayloadScreaming);
    await sleep(3000); // Wait for 4 second

    const singleResponseDataIncandescent = await makeRequest(url, headers, singlePayloadIncandescent);
    await sleep(3000); // Wait for 4 second

    const singleResponseDataMaven = await makeRequest(url, headers, singlePayloadMaven);
    // No need to sleep here if this is the last request

    // Calculate prices
    const divinePrice = calculatePrice(currencyResponseData, 21);
    const bulkPriceScreaming = calculatePrice(bulkResponseDataScreaming, 1);
    const bulkPriceIncandescent = calculatePrice(bulkResponseDataIncandescent, 1);
    const bulkPriceMaven = calculatePrice(bulkResponseDataMaven, 1);
    const singlePriceScreaming = calculatePrice(singleResponseDataScreaming, 7);
    const singlePriceIncandescent = calculatePrice(singleResponseDataIncandescent, 7);
    const singlePriceMaven = calculatePrice(singleResponseDataMaven, 7);

    // Profit calculations
    const profitScreaming = (divinePrice * bulkPriceScreaming) - singlePriceScreaming;
    const profitIncandescent = (divinePrice * bulkPriceIncandescent) - singlePriceIncandescent;
    const profitMaven = (divinePrice * bulkPriceMaven) - singlePriceMaven;

    // Compile the results
    const results = {
        divine_price: divinePrice,
        bulk_price_screaming: bulkPriceScreaming,
        bulk_price_incandescent: bulkPriceIncandescent,
        bulk_price_maven: bulkPriceMaven,
        single_price_screaming: singlePriceScreaming,
        single_price_incandescent: singlePriceIncandescent,
        single_price_maven: singlePriceMaven,
        profit_screaming: profitScreaming,
        profit_incandescent: profitIncandescent,
        profit_maven: profitMaven
    };
    return results;
}

// Update results by cron
app.get('/update-cron', async (req, res) => {
    try {
        const results = await dataProcess();
        finalResults = results;
        console.log("Results updated:", results);
        console.log("Results updated at:", new Date());
        res.status(200).send('Update success triggered by cron job');
    } catch (error) {
        console.error('Error updating results:', error);
    }
});

// API endpoint
app.get('/calculate-prices', async (req, res) => {
    try {
        // Check if finalResults is empty
        if (Object.keys(finalResults).length === 0) {
            console.log("finalResults is empty, triggering update.");
            // Since finalResults is empty, call dataProcess to update it
            finalResults = await dataProcess();
            console.log("Results updated:", finalResults);
        }
        console.log("Results calculated:", finalResults);
        res.json(finalResults); // Send back the latest data
    } catch (error) {
        console.error('Error in /calculate-prices:', error);
        res.status(500).send('Error in processing data');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
