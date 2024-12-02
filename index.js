import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

db.connect((err) => {
  if (err) {
    console.error('connection error', err);
    return;
  }
  console.log('connected');
});

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let items = [
  { id: 1, title: "Wake Up" },
  { id: 2, title: "Do Something" },
];

app.get("/", async (req, res) => {
  const date = new Date();
  const dayIndex = date.getDay();
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = daysOfWeek[dayIndex];

  try {
    const queryAllItems = await db.query("SELECT * FROM items ORDER BY id ASC");
    items = queryAllItems.rows;
    res.render("index.ejs", {
      listTitle: today,
      listItems: items,
      errorMessage: ""
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching items');
  }
});

app.post("/add", async (req, res) => {
  const item = req.body.newItem;

  if (!item || item.trim() === "") {
    return res.render("index.ejs", {
      listTitle: "Today",
      listItems: items,
      errorMessage: "Item cannot be empty."
    });
  }

  try {
    const itemAdded = await db.query("INSERT INTO items(title) VALUES($1) RETURNING *", [item]);
    items.push(itemAdded.rows[0]);
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send('Error adding item');
  }
});

app.post("/edit", async (req, res) => {
  const updatedTitle = req.body.updatedItemTitle;
  const id = req.body.updatedItemId;

  try {
    const edit = await db.query("UPDATE items SET title = $1 WHERE id = $2 RETURNING *", [updatedTitle, id]);
    const updatedItem = edit.rows[0];
    items = items.map(item => item.id === updatedItem.id ? updatedItem : item);
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send('Error editing item');
  }
});

app.post("/delete", async (req, res) => {
  const idToDelete = req.body.deleteItemId;

  try {
    await db.query("DELETE FROM items WHERE id = $1", [idToDelete]);
    items = items.filter(item => item.id !== idToDelete);
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting item');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});