const express = require("express");
const exphbs = require("express-handlebars");
const mysql2 = require("mysql2");

const app = express();

app.use(
    express.urlencoded({
      extended: true
    })
)

app.use(express.json());

app.engine("handlebars", exphbs.engine());
app.set("view engine", "handlebars");

app.use(express.static('public'));
//Fazendo as rotas

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/areaturma", (req, res) => {
    res.render("areaturma");
});

app.get("/infoturmas", (req, res) => {
    res.render("infoturmas");
});

app.get("/conta", (req, res) => {
    res.render("conta");
});

app.get("/status", (req, res) => {
    res.render("status");
});

app.get("/avaliacao", (req, res) => {
    res.render("avaliacao");
});

app.get("/avaliacao/ocorrencia", (req, res) => {
    res.render("avaliacaoOcorrencia");
});



/* Conexão com banco de dados */
const conn = mysql2.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "carometro",
  });
  
  /* Configuração do Banco */
  conn.connect(function (err) {
    if (err) {
      console.log(err);
    }
  
    /* Porta e executando o projeto */
    app.listen(3000);
    console.log("Conectou ao banco de dados");
  });