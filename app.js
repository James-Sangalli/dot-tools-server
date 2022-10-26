const express = require('express');
const app = express();
const port = 3000;
const knexConfig = require('./knexfile.js');
const knex = require('knex')(knexConfig[process.env.NODE_ENV || "development"]);

app.get('/dot-pool-selector', (req, res) => {
  knex("poolSelectorResultsTable").select("results").then((data) => {
    res.send(data[data.length - 1].results);
  });
});

app.get('/dot-validator-selector', (req, res) => {
  knex("dotSelectorResultsTable").select("results").then((data) => {
    res.send(data[data.length - 1].results);
  });
});

app.get('/dot-staking-income/prices', (req, res) => {
  knex("dotStakingPricesTable").select("prices").then((data) => {
    res.send(data[data.length - 1].prices);
  });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});