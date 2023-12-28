const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());


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
// API endpoint
app.get('/calculate-prices', async (req, res) => {
    // Your Node.js code logic
    const url = 'https://www.pathofexile.com/api/trade/exchange/Affliction';
    const headers = {
        'Content-Type': 'application/json',
        // Use your own cookie
        'Cookie': '',
        'User-Agent': 'your-user-agent'
    };

    // Create payloads
    const currencyPayload = createPayload("online", ["chaos"], ["divine"], 1);
    const bulkPayloadScreaming = createPayload("online", ["divine"], ["screaming-invitation"], 10);
    const bulkPayloadIncandescent = createPayload("online", ["divine"], ["incandescent-invitation"], 10);
    const singlePayloadScreaming = createPayload("online", ["chaos"], ["screaming-invitation"], 1);
    const singlePayloadIncandescent = createPayload("online", ["divine"], ["incandescent-invitation"], 1);

    // Make requests with delays to prevent rate limiting
    const currencyResponseData = await makeRequest(url, headers, currencyPayload);
    await sleep(1000); // Wait for 1 second

    const bulkResponseDataScreaming = await makeRequest(url, headers, bulkPayloadScreaming);
    await sleep(1000); // Wait for 1 second

    const bulkResponseDataIncandescent = await makeRequest(url, headers, bulkPayloadIncandescent);
    await sleep(1000); // Wait for 1 second

    const singleResponseDataScreaming = await makeRequest(url, headers, singlePayloadScreaming);
    await sleep(1000); // Wait for 1 second

    const singleResponseDataIncandescent = await makeRequest(url, headers, singlePayloadIncandescent);
    // No need to sleep here if this is the last request

    // Calculate prices
    const divinePrice = calculatePrice(currencyResponseData, 21);
    const bulkPriceScreaming = calculatePrice(bulkResponseDataScreaming, 1);
    const bulkPriceIncandescent = calculatePrice(bulkResponseDataIncandescent, 1);
    const singlePriceScreaming = calculatePrice(singleResponseDataScreaming, 7);
    const singlePriceIncandescent = calculatePrice(singleResponseDataIncandescent, 7);

    // Profit calculations
    const profitScreaming = (divinePrice * bulkPriceScreaming) - singlePriceScreaming;
    const profitIncandescent = divinePrice * (bulkPriceIncandescent - singlePriceIncandescent);

    // Compile the results
    const results = {
        "divine_price": divinePrice,
        "bulk_price_screaming": bulkPriceScreaming,
        "bulk_price_incandescent": bulkPriceIncandescent,
        "single_price_screaming": singlePriceScreaming,
        "single_price_incandescent": singlePriceIncandescent,
        "profit_screaming": profitScreaming,
        "profit_incandescent": profitIncandescent
    };

    res.json(results);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
