import express from "express";
import pg from "pg";
import {fileURLToPath} from "url";
import path from "path";
import dayjs from "dayjs";
import bcrypt from "bcrypt";

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
console.log(__filename, __dirname)

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));

//middlewares
app.use(express.static(path.join(__dirname,"public")))
app.use(express.json())
app.use(express.urlencoded({ extended: true }));

//db setup
const db = new pg.Client({
    user : 'postgres',
    host : 'localhost',
    password : 'Sharma@1602',
    database : 'learning trial',
    port : 5432
})

try {
    await db.connect()
    console.log("Talking to DB")
} catch (error) {
    console.log("Error connecting to DB",error)    
}

//routes
app.get("/", (req,res) => {
    res.render("index.ejs");
})

//login
app.post("/login", async(req,res) => {
    let eMail = req.body.email;
    let password = req.body.password;
    console.log(eMail, password);
    let users = await db.query("SELECT * FROM users_login WHERE user_name = $1",[eMail]);

    if(users.rows.length >= 1){
        const storedHash = users.rows[0].password;
        const pMatch = await bcrypt.compare(password, storedHash);
        console.log(pMatch);
        if(pMatch){
            let entries = await db.query("SELECT u.user_name, j.title, j.content, j.created_at, j.id FROM journal_entries j INNER JOIN users_login u ON j.user_id = u.id WHERE u.user_name = $1",[eMail]);
            entries.rows.map( (elem) => {
                let timeStamp = elem.created_at;
                let formatted = dayjs(timeStamp).format("DD-MM-YYYY  HH:mm");
                elem.created_at = formatted
                }  )
            res.render("entries.ejs",{jentries:entries.rows});
        }
        else{
            res.send("Incorrect Password")
        }
    }
    else{
        const saltRounds = 10;
        bcrypt.hash(password, saltRounds, async(error, hash) =>{
            if(error){
                res.send("Error signing up");
                console.log(error);
            }
            else{
                const result = await db.query("INSERT INTO users_login(user_name,password) VALUES ($1,$2)",[eMail, hash])
                console.log(result);
                let entries = await db.query("SELECT u.user_name, j.title, j.content, j.created_at, j.id FROM journal_entries j INNER JOIN users_login u ON j.user_id = u.id WHERE u.user_name = $1",[eMail]);
            entries.rows.map( (elem) => {
                let timeStamp = elem.created_at;
                let formatted = dayjs(timeStamp).format("DD-MM-YYYY  HH:mm");
                elem.created_at = formatted
                }  )
                console.log(entries.rows)
                res.render("entries.ejs",{jentries:entries.rows});
            }
        } )

    }

})

app.get("/", async(req,res) => {
    
})



//view post
app.get("/entry/:id", async(req,res) => {
    
    let postId = req.params.id;
    let post = await db.query("SELECT * from journal_entries WHERE id = $1",[postId])
    console.log(post.rows);
    res.render("post.ejs",{posts : post.rows[0]});
})

//edit-post
app.get("/entry/edit/:id", async(req,res) => {
    
    let postId = req.params.id;
    let post = await db.query("SELECT * from journal_entries WHERE id = $1",[postId])
    console.log(post.rows);
    res.render("edit.ejs",{posts : post.rows[0]});
})

//save edit
app.post("/save-edit", async(req,res) => {    
    const {id, title, content} = req.body;
    console.log(id, title, content);
    await db.query("UPDATE journal_entries SET content = $1, title = $2 WHERE id=$3",[content, title, id])
    res.redirect(`/entry/${id}`);
})


app.listen(PORT, () => {
    console.log(`The app is running on port: ${PORT}`)
})