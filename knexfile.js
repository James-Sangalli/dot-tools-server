module.exports = {
    development: {
        client: 'sqlite3',
        connection: {
            filename: __dirname + "/dev.sqlite3"
        }
    },
    useNullAsDefault: true,
    production: {
        client: 'postgresql',
        connection: process.env.DATABASE_URL,
        pool: {
            min: 2,
            max: 10
        },
        migrations: {
            tableName: 'knex_migrations',
            directory: __dirname + '/migrations'
        }
    }
};