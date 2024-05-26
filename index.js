const express = require("express");
const exphbs = require("express-handlebars");
const mysql2 = require("mysql2");
const session = require("express-session");

const app = express();

/* Configurando meu servidor para receber requisições e respostas, além de configurar a sessão */
app.use(
  express.urlencoded({
    extended: true,
  }),
  session({
    secret: "AutoMeterDev" /* Palavra chave da sessão */,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

app.use(express.json());

app.engine("handlebars", exphbs.engine());
app.set("view engine", "handlebars");

app.use(express.static("public"));

//Fazendo as rotas

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/areaturma", (req, res) => {
  const sql = "SELECT * FROM turma";
  conn.query(sql, function (err, data) {
    if (err) {
      console.log(err);
      res.status(500).send("Erro ao buscar turmas");
      return;
    }

    // Formatando as datas de início e término
    data.forEach((turma) => {
      turma.inicio = turma.inicio.toLocaleDateString("pt-BR");
      turma.termino = turma.termino.toLocaleDateString("pt-BR");
    });

    res.render("areaturma", { turmas: data });
  });
});

app.get("/infoturmas/:id", (req, res) => {
  const turmaId = req.params.id;

  // Consulta para obter os estudantes da turma com o ID fornecido, incluindo o caminho da imagem
  // Consulta para obter os estudantes da turma com o ID fornecido, incluindo o id do aluno
  const sqlE = `
SELECT usuario.id AS idAluno, usuario.nome AS nomeAluno, usuario.imagem AS imagemAluno
FROM estudante
INNER JOIN usuario ON estudante.id = usuario.id
WHERE estudante.turma = ?
`;

  conn.query(sqlE, [turmaId], function (err, dataE) {
    if (err) {
      console.log(err);
      res.status(500).send("Erro ao buscar estudantes da turma");
      return;
    }

    const listaEstudantes = dataE;
    const turmaId = req.params.id;

    // Consulta para obter os dados da turma com o ID fornecido
    const sql = `
  SELECT nome, sala
  FROM turma
  WHERE id = ?
`;

    conn.query(sql, [turmaId], function (err, data) {
      if (err) {
        console.log(err);
        res.status(500).send("Erro ao buscar informações da turma");
        return;
      }

      if (data.length === 0) {
        res.status(404).send("Turma não encontrada");
        return;
      }

      const nomeTurma = data[0].nome;
      const salaTurma = data[0].sala;

      res.render("infoturmas", { listaEstudantes, nomeTurma, salaTurma });
    });
  });
});

app.get("/conta", (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    res.redirect("/login");
    return;
  }

  const sql = `SELECT nome, email, niveldeacesso FROM usuario WHERE id = ?`;
  conn.query(sql, [userId], function (err, data) {
    if (err) {
      console.log(err);
      res.status(500).send("Erro ao buscar usuário");
      return;
    }

    if (data.length > 0) {
      const nomeCompleto = data[0].nome;
      const email = data[0].email;
      const nivelDeAcesso = data[0].niveldeacesso;

      res.render("conta", {
        nomeCompleto,
        email,
        nivelDeAcesso
      });
    } else {
      res.status(401).send("Usuário não encontrado");
    }
  });
});

app.get("/status/:id", (req, res) => {
  const alunoId = req.params.id;

  // Consulta para obter as informações do aluno com o ID fornecido
  const sql = `
    SELECT nome, imagem
    FROM usuario
    WHERE id = ?
  `;

  conn.query(sql, [alunoId], function (err, data) {
    if (err) {
      console.log(err);
      res.status(500).send("Erro ao buscar informações do aluno");
      return;
    }

    if (data.length === 0) {
      res.status(404).send("Aluno não encontrado");
      return;
    }

    const nomeAluno = data[0].nome;
    const imagemAluno = data[0].imagem;

    // Renderiza a página status com as informações do aluno
    res.render("status", { nomeAluno, imagemAluno });
  });
});


app.get("/avaliacao", (req, res) => {
  res.render("avaliacao");
});

app.get("/avaliacao.ocorrencia", (req, res) => {
  res.render("avaliacaoOcorrencia");
});

app.get("/avaliacao.elogio", (req, res) => {
  res.render("avaliacaoElogio");
});

app.get("/gerencimentoEscolar", (req, res) => {
  res.render("gerencimentoEscolar");
});

app.get("/areadeacesso", (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    // Se o usuário não estiver logado, redirecione-o para a página de login
    res.redirect("/login");
    return;
  }

  // Consulta para obter o nome da turma do aluno
  const sqlTurmaAluno = `
    SELECT turma.nome AS nomeTurma
    FROM estudante
    INNER JOIN turma ON estudante.turma = turma.id
    WHERE estudante.id = ?;
  `;

  conn.query(sqlTurmaAluno, [userId], function (err, dataTurma) {
    if (err) {
      console.log(err);
      res.status(500).send("Erro ao buscar a turma do aluno");
      return;
    }

    const nomeTurma = dataTurma[0].nomeTurma;

    // Consulta para obter o nome do professor da turma
    const sqlProfessorTurma = `
      SELECT usuario.nome AS nomeProfessor
      FROM turma
      INNER JOIN usuario ON turma.professor = usuario.id
      WHERE turma.nome = ?;
    `;

    conn.query(sqlProfessorTurma, [nomeTurma], function (err, dataProfessor) {
      if (err) {
        console.log(err);
        res.status(500).send("Erro ao buscar o professor da turma");
        return;
      }

      const nomeProfessor = dataProfessor[0].nomeProfessor;

      // Consulta para obter as informações do usuário logado
      const sql = `SELECT nome, email, imagem, niveldeacesso FROM usuario WHERE id = ?`;
      conn.query(sql, [userId], function (err, data) {
        if (err) {
          console.log(err);
          res.status(500).send("Erro ao buscar usuário");
          return;
        }

        if (data.length > 0) {
          const nomeUsuario = data[0].nome;
          const imagemUsuario = data[0].imagem;
          const niveldeacessoUsuario = data[0].niveldeacesso;

          // Renderizando a página areadeacesso com todas as informações necessárias
          res.render("areadeacesso", {
            nomeUsuario,
            imagemUsuario,
            niveldeacessoUsuario,
            nomeTurma,
            nomeProfessor
          });
        } else {
          res.status(401).send("Usuário não encontrado");
        }
      });
    });
  });
});

app.get("/registro", (req, res) => {
  res.render("registro");
});

app.get("/teste", (req, res) => {
  res.render("teste");
});

app.get("/criarTurma", (req, res) => {
  res.render("criarTurma");
});

app.get("/teste/users", (req, res) => {
  const sql = "SELECT * FROM turma";
  conn.query(sql, function (err, dataT) {
    if (err) {
      console.log(err);
      res.status(500).send("Erro ao buscar turmas");
      return;
    }

    const listaTurma = dataT;

    const sqlUsers = "SELECT * FROM usuario;";
    const sqlEstudantes = "SELECT * FROM estudante;";

    conn.query(sqlUsers, function (err, dataUsers) {
      if (err) {
        console.log(err);
        res.status(500).send("Erro ao buscar usuários");
        return;
      }

      const listaUsers = dataUsers;

      conn.query(sqlEstudantes, function (err, dataEstudantes) {
        if (err) {
          console.log(err);
          res.status(500).send("Erro ao buscar estudantes");
          return;
        }

        const listaEstudante = dataEstudantes;

        const sqlFuncionarios = `SELECT * FROM funcionario WHERE funcionario.tipo = "Outro" `;

        conn.query(sqlFuncionarios, function (err, dataFuncionarios) {
          if (err) {
            console.log(err);
            res.status(500).send("Erro ao buscar funcionários");
            return;
          }

          const listaFuncionarios = dataFuncionarios;

          const sqlTurmas = "SELECT * FROM turma";
          conn.query(sqlTurmas, function (err, dataTurmas) {
            if (err) {
              console.log(err);
              res.status(500).send("Erro ao buscar turmas");
              return;
            }

            const listaTurmas = dataTurmas;

            const sqlProfessores = `SELECT usuario.nome FROM usuario INNER JOIN funcionario ON funcionario.id = usuario.id WHERE funcionario.tipo = "Professor"; `;

            conn.query(sqlProfessores, function (err, dataProfessores) {
              if (err) {
                console.log(err);
                res.status(500).send("Erro ao buscar professores");
                return;
              }

              const listaProfessores = dataProfessores;

              const sqlProfessoresDasTurmas = `
              SELECT usuario.nome 
              FROM usuario 
              INNER JOIN turma ON usuario.id = turma.professor
              WHERE turma.id = ?;`;

              conn.query(sqlProfessoresDasTurmas, [this.id], function (err, dataProfessoresTurmas) {
                if (err) {
                  console.log(err);
                  res.status(500).send("Erro ao buscar professor das turmas");
                  return;
                }

                const listaProfessoresDasTurmas = dataProfessoresTurmas;

                res.render("teste", {
                  listaUsers,
                  listaTurma,
                  listaEstudante,
                  listaProfessores,
                  listaFuncionarios,
                  listaTurmas,
                  listaProfessoresDasTurmas,
                });
              });
            }
            );
          });
        });
      });
    });
  });
});

app.post("/login", (req, res) => {
  const emailUsuario = req.body.email;
  const senhaUsuario = req.body.senha;

  const sql = `SELECT id FROM usuario WHERE usuario.email = ? AND usuario.senha = ?`;
  conn.query(sql, [emailUsuario, senhaUsuario], function (err, data) {
    if (err) {
      console.log(err);
      res.status(500).send("Erro ao buscar usuário");
      return;
    }

    if (data.length > 0) {
      const userId = data[0].id;
      req.session.userId = userId; // Armazenando o ID do usuário na sessão
      res.redirect("/areadeacesso");
    } else {
      res.status(401).send("Credenciais inválidas");
    }
  });
});

app.post("/teste/registroTurma", (req, res) => {
  const turmaNome = req.body.nome;
  const turmaMateria = req.body.materia;
  const turmaSala = req.body.sala;
  const turmaCapacidade = req.body.capacidade;
  const turmaInicio = req.body.inicio;
  const turmaTermino = req.body.termino;
  const turmaImagem = req.body.imagem;
  const turmaTurno = req.body.turno;
  const turmaProfessorNome = req.body.professor;

  // Consulta SQL para obter o ID do professor usando o nome
  const sqlProfessor = `SELECT id FROM usuario WHERE nome = ?`;

  conn.query(sqlProfessor, [turmaProfessorNome], function (err, result) {
    if (err) {
      console.log("Erro ao buscar ID do professor:", err);
      return res.status(500).send("Erro ao buscar ID do professor");
    }

    if (result.length > 0) {
      const turmaProfessorId = result[0].id;

      const sqlInserirTurma = `INSERT INTO turma (nome, turno, materia, sala, capacidade, inicio, termino, professor, imagem) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      conn.query(sqlInserirTurma, [turmaNome, turmaTurno, turmaMateria, turmaSala, turmaCapacidade, turmaInicio, turmaTermino, turmaProfessorId, turmaImagem], function (err) {
        if (err) {
          console.log("Erro ao inserir turma:", err);
          return res.status(500).send("Erro ao inserir turma");
        }

        res.redirect("/teste/users");
      });
    } else {
      console.log("Professor não encontrado");
      return res.status(404).send("Professor não encontrado");
    }
  });
});

app.post("/teste/registro", (req, res) => {
  const userName = req.body.nome;
  const userEmail = req.body.email;
  const userSenha = req.body.senha;
  const userNivelDeAcesso = req.body.nivelacesso;
  const userImagem = req.body.imagem;
  const userTurma = 4;
  const userTipo = req.body.tipo;

  /* Query do SQL para cadastrar */
  const sqlAddUser = `INSERT INTO usuario(nome, email, senha, niveldeacesso, imagem) VALUES (?, ?, ?, ?, ?)`;

  conn.query(
    sqlAddUser,
    [userName, userEmail, userSenha, userNivelDeAcesso, userImagem],
    function (err, result) {
      if (err) {
        console.log("Erro:", err);
        return res.status(500).send("Erro ao cadastrar usuário");
      }

      const userId = result.insertId; // Obtendo o ID do usuário inserido

      // Verificando o tipo de usuário e inserindo na tabela correspondente
      if (userTipo === "Estudante") {
        const sqlAddStudent = `INSERT INTO estudante(id, turma) VALUES (?, ?)`;
        conn.query(sqlAddStudent, [userId, userTurma], function (err) {
          if (err) {
            console.log("Erro ao cadastrar estudante:", err);
            return res.status(500).send("Erro ao cadastrar estudante");
          }
          res.redirect("/teste/users");
        });
      } else {
        const sqlAddFuncionario = `INSERT INTO funcionario(id, tipo) VALUES (?, ?)`;
        conn.query(sqlAddFuncionario, [userId, userTipo], function (err) {
          if (err) {
            console.log("Erro ao cadastrar funcionário:", err);
            return res.status(500).send("Erro ao cadastrar funcionário");
          }
          res.redirect("/teste/users");
        });
      }
    }
  );
});

app.post("/teste/alunoTurma", (req, res) => {
  const nomeAluno = req.body.nome;
  const nomeTurma = req.body.Turma;

  // Primeiro, precisamos obter o ID do aluno usando o nome
  const sqlBuscarAluno = `SELECT id FROM usuario WHERE nome = ?`;

  conn.query(sqlBuscarAluno, [nomeAluno], function (err, result) {
    if (err) {
      console.log("Erro ao buscar ID do aluno:", err);
      return res.status(500).send("Erro ao buscar ID do aluno");
    }

    if (result.length > 0) {
      const alunoId = result[0].id;

      // Agora, precisamos obter o ID da turma usando o nome
      const sqlBuscarTurma = `SELECT id FROM turma WHERE nome = ?`;

      conn.query(sqlBuscarTurma, [nomeTurma], function (err, result) {
        if (err) {
          console.log("Erro ao buscar ID da turma:", err);
          return res.status(500).send("Erro ao buscar ID da turma");
        }

        if (result.length > 0) {
          const turmaId = result[0].id;

          // Agora que temos os IDs do aluno e da turma, podemos inserir o aluno na turma
          const sqlInserirAlunoNaTurma = `INSERT INTO estudante (id, turma) VALUES (?, ?)`;

          conn.query(sqlInserirAlunoNaTurma, [alunoId, turmaId], function (err) {
            if (err) {
              console.log("Erro ao inserir aluno na turma:", err);
              return res.status(500).send("Erro ao inserir aluno na turma");
            }

            res.redirect("/teste/users");
          });
        } else {
          console.log("Turma não encontrada");
          return res.status(404).send("Turma não encontrada");
        }
      });
    } else {
      console.log("Aluno não encontrado");
      return res.status(404).send("Aluno não encontrado");
    }
  });
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
