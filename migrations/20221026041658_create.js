/**
 * @param { import("knex").Knex } knex
 * @returns {Promise<void[]>}
 */
exports.up = function(knex) {
    return Promise.all([
        knex.schema.createTableIfNotExists('poolSelectorResultsTable', function(table) {
            table.increments('id')
            table.string("results")
        }),
        knex.schema.createTableIfNotExists('dotSelectorResultsTable', function(table) {
            table.increments('id')
            table.string("results")
        }),
        knex.schema.createTableIfNotExists('dotStakingPricesTable', function(table) {
            table.increments('id')
            table.string("prices")
        }),
    ])
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return Promise.all ([
        knex.schema.dropTableIfExists('poolSelectorResultsTable').then(function () {
            console.log('poolSelectorResultsTable was dropped')
        }),
        knex.schema.dropTableIfExists('dotSelectorResultsTable').then(function () {
            console.log('dotSelectorResultsTable was dropped')
        }),
        knex.schema.dropTableIfExists('dotStakingPricesTable').then(function () {
            console.log('dotStakingPricesTable was dropped')
        }),
    ]);
};
