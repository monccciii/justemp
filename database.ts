import mysql from "mysql";

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT as string),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    multipleStatements: true
});


connection.connect(err => {
    if (err) {
        console.error("Error connecting: " + err.stack);
        //process.exit();
    } else console.log("Connected as id " + connection.threadId);
});

// const result =   connection.query("SELECT FULL_NAME FROM NationsInfo", (err, result) => {
//    console.log(result)
 //   console.log(err)
//  })
export default connection;