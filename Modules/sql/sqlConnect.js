const mssql = require('mssql')
const sqlConfig = {
    user:'MyPuzzles',
    password: process.env.PASSWORD,
    server: 'localhost',
    database: 'MyPuzzles',
    options:{
        encrypt: true,
        trustServerCertificate: true
    }
}
const db = new mssql.ConnectionPool(sqlConfig)
db.connect(sqlConfig)

module.exports = db