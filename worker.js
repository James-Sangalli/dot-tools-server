const PoolSelector = require("./PoolSelector"); // TODO use a proper npm import, this is a workaround
const ValidatorSelector = require("dot-validator-selector/util/ValidatorSelector.js");
const { ApiPromise, WsProvider } = require("@polkadot/api");
const polkadotProvider = "wss://polkadot.api.onfinality.io/ws?apikey=09f0165a-7632-408b-ba81-08f964b607f7";
const kusamaProvider = "wss://kusama.api.onfinality.io/ws?apikey=09f0165a-7632-408b-ba81-08f964b607f7";
const knexConfig = require('./knexfile.js');
const knex = require('knex')(knexConfig[process.env.NODE_ENV || "development"]);
const { BN } = require("@polkadot/util");
const request = require("superagent");

async function main() {
    const ksmAPI = await ApiPromise.create({ provider: new WsProvider(kusamaProvider) });
    const dotAPI = await ApiPromise.create({ provider: new WsProvider(polkadotProvider) });
    const selectorKSM = new ValidatorSelector(ksmAPI, undefined, undefined, 100);
    const selectorDOT = new ValidatorSelector(dotAPI, undefined, undefined, 1000);
    await updateValidatorSelectorCache(["ksm", "dot"], [selectorKSM, selectorDOT], [24, 16]);
    await updatePoolSelectorCache(ksmAPI, selectorKSM); // TODO change to dot when ready
    await updateStakingIncomeCache();
}

async function updateStakingIncomeCache() {
    const currencies = ["aud", "cad", "chf", "eur", "nzd", "sgd", "usd"];
    const coins = ["kusama", "polkadot"];
    const data = {};
    for(const coin of coins) {
        for (let currency of currencies) {
            const query = `https://api.coingecko.com/api/v3/coins/${coin}/market_chart?vs_currency=${currency}&days=max`;
            const result = await request.get(query);
            if(coin === "kusama") {
                data[`${currency}KSM`] = result.body;
            } else {
                data[`${currency}DOT`] = result.body;
            }
        }
    }
    return new Promise((res, rej) => {
        knex("dotStakingPricesTable").insert({ prices:  JSON.stringify(data) })
            .then((i) => { res(i) })
            .catch((e) => { rej(e) });
    });
}

async function updateValidatorSelectorCache(networks, selectors, amounts) {
    const data = {};
    for(let i = 0; i < selectors.length; i++) {
        data[networks[i]] = await selectors[i].getValidators(amounts[i]);
        if(data[networks[i]].length === 0) return;
    }
    return new Promise((res, rej) => {
        knex("dotSelectorResultsTable").insert({ results:  JSON.stringify(data) })
            .then((i) => { res(i) })
            .catch((e) => { rej(e) });
    });
}

async function updatePoolSelectorCache(api, validatorSelector) {
    const options = {
        checkForDuplicateValidators: false,
        checkRootVerified: false,
        checkValidators: false,
        era: 0,
        maxMembers: 1024, // TODO place polkadot default here on launch (currently kusama)
        minNumberOfValidators: 1,
        minSpots: 1,
        rootMinStake: new BN(0),
        numberOfPools: 1,
    }
    const pools = {};
    const poolSelector = new PoolSelector.default(validatorSelector, api, options);
    console.log(`pool selector ${poolSelector}`)
    pools.results = await poolSelector.getPoolsMeetingCriteria();
    if(pools.results.length !== 0) {
        return new Promise((res, rej) => {
            knex("poolSelectorResultsTable").insert({ results:  JSON.stringify(pools) })
                .then((i) => { res(i) })
                .catch((e) => { rej(e) });
        });
    }
}

main().then(() => {
    console.log("update complete");
    process.exit(0);
}).catch((e) => {
    console.error(e);
    process.exit(-1);
});