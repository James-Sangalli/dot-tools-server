const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const knexConfig = require('./knexfile.js');
const knex = require('knex')(knexConfig[process.env.NODE_ENV || "development"]);

app.get('/dot-pool-selector/:network', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const network = req.params.network;
  if(network == "ksm") {
    knex("poolSelectorResultsTableKSM").select("results").then((data) => {
      try {
        res.send(data[data.length - 1].results);
      } catch (e) {
        res.send(e);
      }
    });
  } else {
    knex("poolSelectorResultsTableDOT").select("results").then((data) => {
      try {
        res.send(data[data.length - 1].results);
      } catch (e) {
        res.send(e);
      }
    });
  }
});

app.get('/dot-validator-selector', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
    knex("dotSelectorResultsTable").select("results").then((data) => {
      try {
        res.send(data[data.length - 1].results);
      } catch (e) {
        res.send(e);
      }
    });
});

app.get('/dot-staking-income/prices', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  knex("dotStakingPricesTable").select("prices").then((data) => {
    try {
      res.send(data[data.length - 1].prices);
    } catch (e) {
      res.send(e);
    }
  });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
