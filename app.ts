require("dotenv").config();
const axios = require('axios');


//import url from "url";
import express, { Request, response } from "express";
import cors from "cors";
import DiscordOauth2, { User } from "discord-oauth2";
import connection from "./database";

const app = express();
const port = parseInt(process.env.PORT as string);
const oauth = new DiscordOauth2({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI,
});

app.use(cors({ origin: "https://www.realearthcraft.com" }));

app.use(express.json())



app.get("/auth/login", (_, res) => res.redirect(process.env.DISCORD_URI_LOGIN));


app.get("/", (_, res) => {
    res.send("Hello World!");
});


//nations
app.get("/getNations", (_, res) => {
    connection.query("SELECT FULL_NAME, FLAG_URL, id FROM NationsInfo", (err, result) => {
        if (err) {
            res.status(500).send(err.message);
        } else {
            res.json(result);
        }
    });
});

app.post("/getAllNationInfo", (req: Request<{
    nationid: string
}>, res) => {
    const NATION_ID = req.body.nationid;
    connection.query(`SELECT ANTHEM, RELIGION, MAIN_COUNTRY, ECONOMIC_SYSTEM, GOVERNMENT_SYSTEM, UN_MEMBER, DISCORD_SERVER_ID FROM NationsInfo WHERE id = ${NATION_ID}`, (err, result) => {
        if (err) {
            res.status(500).send(err.message);
        } else {
            res.json(result);
        }
    });
})  

app.post("/addMember", (req: Request<{
    userid: string
    nationid: string
}>, res) => {
    const USER_ID = req.body.userid;
const NATION_ID = req.body.nationid;

connection.query("INSERT INTO NationsApplications SET USER_ID = ?, NATION_ID = ?, APPLICATION_STATUS = ?, DATETIME_VAR = NOW()", [USER_ID, NATION_ID, "Pending"], (err, result) => {
    if (err) {
        console.error(err);
        res.status(500).send(err.message);
    } else {
        res.json(result);
    }
});
})  


//businesses
app.get("/getBusinesses", async (_, res) => {
    try {
        const query = `
        SELECT b.id, b.BUSINESS_NAME, b.TYPE, CAST(b.OWNER_ID as CHAR) as OWNER_ID, p.BUSINESS_NAME as PARENT_COMPANY, h.BUSINESS_NAME as HEADQUARTERS, b.LOGO_URL, b.FOUNDING_DATETIME 
        FROM Businesses b 
        LEFT JOIN Businesses p ON b.PARENT_COMPANY = p.id 
        LEFT JOIN Businesses h ON b.HEADQUARTERS = h.id 
        WHERE b.IS_CLOSED IS FALSE`;
        connection.query(query, (err, result) => {
            if (err) {
                console.error(err);
                res.status(500).send(err.message);
                return;
            }
            res.json(result);
        });
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});






// my businesses
app.post("/myBusinesses", (req: Request<{
    ownerid: string
}>, res) => {
    const OWNER_ID = req.body.ownerid;
    const query = `SELECT b1.id, b1.BUSINESS_NAME, b1.TYPE, b1.OWNER_ID, b1.LOGO_URL, b1.FOUNDING_DATETIME, 
    b2.BUSINESS_NAME as PARENT_COMPANY, b3.BUSINESS_NAME as HEADQUARTERS 
    FROM Businesses b1 
    LEFT JOIN Businesses b2 ON b1.PARENT_COMPANY = b2.id
    LEFT JOIN Businesses b3 ON b1.HEADQUARTERS = b3.id
    WHERE b1.OWNER_ID = ${OWNER_ID} AND b1.IS_CLOSED IS FALSE`;

    connection.query(query, (err, result) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }
        res.json(result);
    });
});

app.post("/business", (req: Request<{
    bid: string
}>, res) => {
    const BUSINESS_ID = req.body.bid;
    console.log(BUSINESS_ID);

    const query = `
        SELECT b.BUSINESS_NAME, b.TYPE, CAST(b.OWNER_ID as CHAR) as OWNER_ID, h.BUSINESS_NAME as HEADQUARTERS, p.BUSINESS_NAME as PARENT_COMPANY, b.LOGO_URL, b.FOUNDING_DATETIME
        FROM Businesses b
        LEFT JOIN Businesses h ON b.HEADQUARTERS = h.id
        LEFT JOIN Businesses p ON b.PARENT_COMPANY = p.id
        WHERE b.id = ?
    `;

    connection.query(query, [BUSINESS_ID], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send(err.message);
            return;
        }
        console.log(result);
        res.json(result);
    });
});

app.post("/nationGet", (req: Request<{nid: string}>, res) => {
    const NATION_ID = req.body.nid
    console.log(NATION_ID)
    connection.query(`SELECT FLAG_URL, FULL_NAME, ANTHEM, SHORT_NAME, ABBREVIATION, RELIGION, MAIN_COUNTRY, ECONOMIC_SYSTEM, GOVERNMENT_SYSTEM, UN_MEMBER, DISCORD_SERVER_ID FROM NationsInfo WHERE id = ?`,[NATION_ID], (err, result) => {
        if (err) {
            res.status(500).send(err.message);
            return;
        }
        console.log(result)
        res.json(result);
    });
}
)

app.post("/myNations", (req: Request<{
    userid: string
}>, res) => {
    const USER_ID = req.body.userid;
    console.log(USER_ID)
    connection.query(`
        SELECT
            nu.PARENT_NATION_ID,
            nu.ROLE_VAR,
            ni.FULL_NAME,
            ni.ABBREVIATION,
            ni.FLAG_URL,
            ni.ANTHEM,
            ni.RELIGION,
            ni.MAIN_COUNTRY,
            ni.ECONOMIC_SYSTEM,
            ni.GOVERNMENT_SYSTEM,
            ni.UN_MEMBER,
            (SELECT COUNT(*) FROM NationsUsers WHERE PARENT_NATION_ID = nu.PARENT_NATION_ID) as TOTAL_CITIZENS
        FROM
            NationsUsers nu
        LEFT JOIN
            NationsInfo ni
        ON
            nu.PARENT_NATION_ID = ni.id
        WHERE
            nu.USER_ID = ?
    `,
    [USER_ID], (err, result) => {
        if (err) {
            res.status(500).send(err.message);
        } else {
            res.json(result);
        }
    });
});



//oauth
app.get("/auth/discord", async (req, res) => {
    const {
        code
    } = req.query;

    if (!code) return res.status(300);

    try {
        let returned: Awaited<ReturnType<typeof oauth["tokenRequest"]>>

        if (req.cookies?.refresh_token) {
            try {
                returned = await oauth.tokenRequest({
                    grantType: "refresh_token",
                    refreshToken: <string>req.cookies.refresh_token,
                    scope: process.env.SCOPE,
                    code: <string>code
                });
            } catch {}
        }

        if (!returned) {
            returned = await oauth.tokenRequest({
                grantType: "authorization_code",
                scope: process.env.SCOPE,
                code: <string>code
            });
        }

        const {
            refresh_token,
            access_token,
            expires_in,
        } = returned;
        const data = {
            user: <User>await fetch(`https://discordapp.com/api/users/@me`, {
                headers: {
                    Authorization: `Bearer ${access_token}`
                }
            })
                .then(res => res.json()),
            login: {
                refresh_token,
                access_token,
                expires_in
            }
        };

        return res.redirect(`${req.protocol}://${req.hostname}/auth/discord?data=${encodeURIComponent(JSON.stringify(data))}`);
    } catch (err) {
        console.log(err);
        res.sendStatus(400);
    } 
});

app.post("/getNewtoken", async (req: Request<{refreshtoken: string}>, res) => {
    const refresh_token = req.body.refreshtoken;
    const client_id = process.env.CLIENT_ID;
    const client_secret = process.env.CLIENT_SECRET;
    try {
        const response = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: `grant_type=refresh_token&refresh_token=${refresh_token}&client_id=${client_id}&client_secret=${client_secret}`
        });
        const json = await response.json();
        console.log(json);
        res.json(json);
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});


app.get("/userInfo", async (req, res) => {
    const {
        access_token
    } = req.query;

    if (access_token) {
        try {
            res.send(
                <User>await fetch(`https://discordapp.com/api/users/@me`, {
                    headers: {
                        Authorization: `Bearer ${access_token}`
                    }
                })
                    .then(res => res.json())
            );
        } catch (e) {
            return res.status(404).send(e.toString());
        }
    } else {
        res.status(404).send("User info not found");
    }
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
