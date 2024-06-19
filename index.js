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

const hbs = exphbs.create({
  helpers: {
    /* Área onde os helpers serão registrados */
  },
});

// Criando os helpers

// Pegar tamanho de um array
hbs.handlebars.registerHelper("length", function (array) {
  return array.length;
});

// Verificando se algo é maior que outro
hbs.handlebars.registerHelper("gte", function (a, b) {
  return a >= b;
});

// Verificando se algo é maior que outro 2
hbs.handlebars.registerHelper("gte2", function (a, b, options) {
  if (a >= b) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

// Verificando se algo é menor que outro
hbs.handlebars.registerHelper("lte", function (a, b) {
  return a <= b;
});

// Verificando se algo é igual a outro
hbs.handlebars.registerHelper("equal", function (a, b, options) {
  if (a === b) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

// Função de condição
hbs.handlebars.registerHelper("if", function (conditional, options) {
  if (conditional) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

// Restante das configurações iniciais

app.use(express.json());

app.engine("handlebars", exphbs.engine());
app.set("view engine", "handlebars");

app.use(express.static("public"));

// Funções facilitadoras

// Verificar login
function verificarLogin(params, res) {
  if (!params) {
    res.redirect("/login");
    return;
  }
}

// Pegando o nível de acesso
function getAccessLevelIndex(accessLevel) {
  const levels = {
    "Acesso Básico": 1,
    "Acesso Pedagógico": 2,
    "Acesso Pedagógico Avançado": 3,
    "Administrativo Total": 4
  };
  return levels[accessLevel] || 0;
}

// Levando a página de erro
function errorPage(descricaoErro, res) {

  const Erro = descricaoErro
  res.render("error", { Erro });
}

// Levando a página de erro + Console

function errorPageConsole(descricaoErro, err, res) {

  const Erro = descricaoErro;
  console.log("Erro: " + err);

  res.render("error", { Erro });
}

// Listando erros
const permissionError = "Você não tem permissão de acessar essa página."; /* Erro de permissão */

//Fazendo as rotas

app.get("/", (req, res) => {
  const sqlTop5 = `
    SELECT u.nome AS nomeUsuario, e.avaliacao AS pontos, u.imagem AS imagemUsuario,
           FIND_IN_SET(e.avaliacao, (SELECT GROUP_CONCAT(avaliacao ORDER BY avaliacao DESC) FROM estudante)) AS posicao
    FROM estudante e
    JOIN usuario u ON e.id = u.id
    ORDER BY e.avaliacao DESC
    LIMIT 5;
  `;

  const sqlTop6To10 = `
    SELECT u.nome AS nomeUsuario, e.avaliacao AS pontos, u.imagem AS imagemUsuario,
           FIND_IN_SET(e.avaliacao, (SELECT GROUP_CONCAT(avaliacao ORDER BY avaliacao DESC) FROM estudante)) AS posicao
    FROM estudante e
    JOIN usuario u ON e.id = u.id
    ORDER BY e.avaliacao DESC
    LIMIT 5, 5;
  `;

  const userId = req.session.userId;

  conn.query(sqlTop5, (errTop5, resultsTop5) => {
    if (errTop5) {
      console.error(
        "Erro ao executar a consulta SQL para os top 1 a 5:",
        errTop5
      );
      res.status(500).send("Erro interno do servidor");
      return;
    }

    conn.query(sqlTop6To10, (errTop6To10, resultsTop6To10) => {
      if (errTop6To10) {
        console.error(
          "Erro ao executar a consulta SQL para os top 6 a 10:",
          errTop6To10
        );
        res.status(500).send("Erro interno do servidor");
        return;
      }

      const sqlUsuarioLogado = `SELECT * FROM usuario WHERE id = ?`;

      conn.query(sqlUsuarioLogado, [userId], function (err, result) {
        if (err) {
          console.error("Erro ao executar a consulta de usuário logado", err);
          res.status(500).send("Erro ao achar usuário");
          return;
        }

        const userInfo = result;

        const sqlUserInfoPosition = `
          SELECT u.nome, u.imagem, e.avaliacao,
                 FIND_IN_SET(e.avaliacao, (SELECT GROUP_CONCAT(avaliacao ORDER BY avaliacao DESC) FROM estudante)) AS posicao
          FROM estudante e
          JOIN usuario u ON e.id = u.id
          WHERE u.id = ?
        `;
        conn.query(sqlUserInfoPosition, [userId], function (err, userPosition) {
          if (err) {
            console.log("Erro ao achar posição do ranking do usuário", err);
            res.status(500).send("Erro ao achar posição do ranking do usuário");
            return;
          }

          res.render("home", {
            topAlunosTop5: resultsTop5,
            topAlunosTop6To10: resultsTop6To10,
            userInfo,
            posicao: userPosition,
          });
        });
      });
    });
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/error", (req, res) => {
  res.render("error");
});

app.get("/deletarUser", (req, res) => {

  const userId = req.session.userId;

  verificarLogin(userId, res);

  const AcessLevel = req.session.AcessLevel;
  if (AcessLevel <= 2) {
    errorPage(permissionError, res);
    return;
  }
  res.render("deletarUser");
});

app.get("/atualizarTurma", (req, res) => {

  const userId = req.session.userId;

  verificarLogin(userId, res);

  const AcessLevel = req.session.AcessLevel;
  if (AcessLevel <= 2) {
    errorPage(permissionError, res);
    return;
  }

  const sql = "SELECT * FROM turma";
  conn.query(sql, function (err, dataT) {
    if (err) {
      console.log(err);
      res.status(500).send("Erro ao buscar turmas");
      return;
    }

    const listaTurma = dataT;

    const sqlProfessores = `SELECT usuario.nome FROM usuario INNER JOIN funcionario ON funcionario.id = usuario.id WHERE funcionario.tipo = "Professor"; `;

    conn.query(sqlProfessores, function (err, dataProfessores) {
      if (err) {
        console.log(err);
        res.status(500).send("Erro ao buscar professores");
        return;
      }

      const listaProfessores = dataProfessores;
      res.render("atualizarTurma", { listaTurma, listaProfessores });
    });
  });
});

app.get("/adicionarTurma", (req, res) => {

  const userId = req.session.userId;

  verificarLogin(userId, res);

  const AcessLevel = req.session.AcessLevel;
  if (AcessLevel <= 1) {
    errorPage(permissionError, res);
    return;
  }

  const sql = "SELECT * FROM turma";
  conn.query(sql, function (err, dataT) {
    if (err) {
      console.log(err);
      res.status(500).send("Erro ao buscar turmas");
      return;
    }

    const listaTurma = dataT;
    res.render("adicionarTurma", { listaTurma });
  });
});

app.get("/deletarTurma", (req, res) => {

  const userId = req.session.userId;

  verificarLogin(userId, res);

  const AcessLevel = req.session.AcessLevel;
  if (AcessLevel <= 1) {
    errorPage(permissionError, res);
    return;
  }

  const sql = "SELECT * FROM turma";
  conn.query(sql, function (err, dataT) {
    if (err) {
      console.log(err);
      res.status(500).send("Erro ao buscar turmas");
      return;
    }

    const listaTurma = dataT;


    res.render("deletarTurma", { listaTurma });
  });
})

app.get("/atualizarUser", (req, res) => {

  const userId = req.session.userId;

  verificarLogin(userId, res);

  const AcessLevel = req.session.AcessLevel;
  if (AcessLevel <= 1) {
    errorPage(permissionError, res);
    return;
  }

  res.render("atualizarUser", { AcessLevel });
});

app.get("/areaturma", (req, res) => {
  const userId = req.session.userId;

  verificarLogin(userId, res);

  const AcessLevel = req.session.AcessLevel;
  if (AcessLevel === 1) {
    errorPage(permissionError, res);
    return;
  }
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
  const userId = req.session.userId;
  const AcessLevel = req.session.AcessLevel;

  verificarLogin(userId, res);

  if (AcessLevel === 1) {
    errorPage(permissionError, res);
    return;
  }
  const turmaId = req.params.id;

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

app.get("/infoFuncionarios", (req, res) => {
  const userId = req.session.userId;

  verificarLogin(userId, res);

  const AcessLevel = req.session.AcessLevel;
  if (AcessLevel <= 2) {
    errorPage(permissionError, res);
    return;
  }
  const sqlFindFuncionarios =
    "SELECT usuario.nome, usuario.imagem, funcionario.tipo, usuario.id, usuario.niveldeacesso FROM usuario INNER JOIN funcionario ON usuario.id = funcionario.id";

  conn.query(sqlFindFuncionarios, function (err, result) {
    if (err) {
      console.log("Erro ao tentar encontrar funcionários ", err);
      res.status(500).send("Erro ao buscar funcionários");
    }

    const listaFuncionarios = result;

    let AcessLevelFuncionario;
    switch (result[0].niveldeacesso) {
      case "Acesso Básico":
        AcessLevelFuncionario = 1;
        break;
      case "Acesso Pedagógico":
        AcessLevelFuncionario = 2;
        break;
      case "Acesso Pedagógico Avançado":
        AcessLevelFuncionario = 3;
        break;
      case "Administrativo Total":
        AcessLevelFuncionario = 4;
        break;
      default:
        AcessLevelFuncionario = 0;
    }

    res.render("infoFuncionarios", {
      listaFuncionarios,
      AcessLevel,
      AcessLevelFuncionario,
    });
  });
});

app.get("/conta/:id", (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    res.redirect("/login");
    return;
  }

  const sql = `SELECT nome, email, niveldeacesso, imagem FROM usuario WHERE id = ?`;
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
      const imagem = data[0].imagem;

      res.render("conta", {
        nomeCompleto,
        email,
        nivelDeAcesso,
        imagem,
      });
    } else {
      res.status(401).send("Usuário não encontrado");
    }
  });
});

app.get("/sairConta", (req, res) => {
  req.session.userId = 0;

  res.redirect("/login");
});

app.get("/status/:id", (req, res) => {
  const userId = req.session.userId;
  const AcessLevel = req.session.AcessLevel;

  verificarLogin(userId, res);

  const usuarioId = req.params.id;

  // Consulta para obter as informações do usuário (aluno ou funcionário) com o ID fornecido
  const sqlUsuario = `SELECT u.nome, u.imagem, u.email, f.tipo AS tipoFuncionario
                      FROM usuario u
                      LEFT JOIN funcionario f ON u.id = f.id
                      WHERE u.id = ?`;

  const sqlReclamacoes = `SELECT r.tipo, r.descricao, r.gravidade, u.nome AS reclamador
                          FROM reclamacao r
                          JOIN usuario u ON r.reclamador_id = u.id
                          WHERE r.reclamado_id = ?`;

  const sqlElogios = `SELECT e.descricao, u.nome AS elogiador
                      FROM elogio e
                      JOIN usuario u ON e.elogiador_id = u.id
                      WHERE e.elogiado_id = ?`;

  conn.query(sqlUsuario, [usuarioId], (err, dataUsuario) => {
    if (err) {
      console.log(err);
      res.status(500).send("Erro ao buscar informações do usuário");
      return;
    }

    if (dataUsuario.length === 0) {
      res.status(404).send("Usuário não encontrado");
      return;
    }

    const nomeUsuario = dataUsuario[0].nome;
    const imagemUsuario = dataUsuario[0].imagem;
    const tipoUsuario = dataUsuario[0].tipoFuncionario ? dataUsuario[0].tipoFuncionario : "Estudante";
    const emailUsuario = dataUsuario[0].email;

    conn.query(sqlReclamacoes, [usuarioId], (err, dataReclamacoes) => {
      if (err) {
        console.log(err);
        res.status(500).send("Erro ao buscar reclamações");
        return;
      }

      conn.query(sqlElogios, [usuarioId], (err, dataElogios) => {
        if (err) {
          console.log(err);
          res.status(500).send("Erro ao buscar elogios");
          return;
        }

        // Renderiza a página status com as informações do usuário, reclamações e elogios
        res.render("status", {
          nomeUsuario,
          imagemUsuario,
          AcessLevel,
          reclamacoes: dataReclamacoes,
          elogios: dataElogios,
          usuarioId,
          tipoUsuario,
          emailUsuario
        });
      });
    });
  });
});

app.get("/avaliacao/:id", (req, res) => {
  const userId = req.session.userId;
  const AcessLevel = req.session.AcessLevel;
  const usuarioId = req.params.id;
  const usuarioIdPoints = req.params.id;

  req.session.userIdPoints = usuarioIdPoints;

  verificarLogin(userId, res);

  // Consulta para obter as informações do usuário (aluno ou funcionário) com o ID fornecido
  const sql = `
    SELECT u.nome, u.imagem, u.id, e.avaliacao, f.tipo AS tipoFuncionario
    FROM usuario u
    LEFT JOIN estudante e ON e.id = u.id
    LEFT JOIN funcionario f ON f.id = u.id
    WHERE u.id = ?;
  `;

  conn.query(sql, [usuarioId], function (err, data) {
    if (err) {
      console.log(err);
      res.status(500).send("Erro ao buscar informações do usuário");
      return;
    }

    if (data.length === 0) {
      res.status(404).send("Usuário não encontrado");
      return;
    }

    const nomeUsuario = data[0].nome;
    const imagemUsuario = data[0].imagem;
    const avaliacaoUsuario = data[0].avaliacao || "Não aplicável";
    const tipoUsuario = data[0].tipoFuncionario ? data[0].tipoFuncionario : "Estudante";

    res.render("avaliacao", {
      nomeUsuario,
      imagemUsuario,
      AcessLevel,
      avaliacaoUsuario,
      usuarioId,
      tipoUsuario
    });
  });
});

app.get("/avaliacao.ocorrencia/:id", (req, res) => {
  const userId = req.session.userId;
  const usuarioId = req.params.id;

  verificarLogin(userId, res);

  const AcessLevel = req.session.AcessLevel;
  if (AcessLevel <= 2) {
    errorPage(permissionError, res);
    return;
  }

  const sql = `
    SELECT u.nome, u.imagem, e.avaliacao, f.tipo AS tipoFuncionario
    FROM usuario u
    LEFT JOIN estudante e ON e.id = u.id
    LEFT JOIN funcionario f ON f.id = u.id
    WHERE u.id = ?;
  `;

  conn.query(sql, [usuarioId], function (err, data) {
    if (err) {
      console.log(err);
      res.status(500).send("Erro ao buscar informações do usuário");
      return;
    }

    if (data.length === 0) {
      res.status(404).send("Usuário não encontrado");
      return;
    }

    const nomeUsuario = data[0].nome;
    const imagemUsuario = data[0].imagem;
    const avaliacaoUsuario = data[0].avaliacao || "Não aplicável";
    const tipoUsuario = data[0].tipoFuncionario ? data[0].tipoFuncionario : "Estudante";

    res.render("avaliacaoOcorrencia", {
      nomeUsuario,
      imagemUsuario,
      avaliacaoUsuario,
      usuarioId,
      tipoUsuario
    });
  });
});

app.get("/avaliacao.elogio/:id", (req, res) => {
  const userId = req.session.userId;
  const usuarioId = req.params.id;

  verificarLogin(userId, res);

  const AcessLevel = req.session.AcessLevel;
  if (AcessLevel <= 2) {
    errorPage(permissionError, res);
    return;
  }

  // Consulta para obter as informações do usuário (aluno ou funcionário) com o ID fornecido
  const sql = `
    SELECT u.nome, u.imagem, e.avaliacao, f.tipo AS tipoFuncionario
    FROM usuario u
    LEFT JOIN estudante e ON e.id = u.id
    LEFT JOIN funcionario f ON f.id = u.id
    WHERE u.id = ?;
  `;

  conn.query(sql, [usuarioId], function (err, data) {
    if (err) {
      console.log(err);
      res.status(500).send("Erro ao buscar informações do usuário");
      return;
    }

    if (data.length === 0) {
      res.status(404).send("Usuário não encontrado");
      return;
    }

    const nomeUsuario = data[0].nome;
    const imagemUsuario = data[0].imagem;
    const avaliacaoUsuario = data[0].avaliacao || "Não aplicável";
    const tipoUsuario = data[0].tipoFuncionario ? data[0].tipoFuncionario : "Estudante";

    res.render("avaliacaoElogio", {
      nomeUsuario,
      imagemUsuario,
      avaliacaoUsuario,
      usuarioId,
      tipoUsuario
    });
  });
});

app.get("/gerenciamentoEscolar", (req, res) => {
  const userId = req.session.userId;
  const AcessLevel = req.session.AcessLevel;
  if (AcessLevel === 1) {
    errorPage(permissionError, res);
    return;
  }

  verificarLogin(userId, res);

  res.render("gerencimentoEscolar", { AcessLevel });
});

app.get("/areadeacesso", (req, res) => {
  const userId = req.session.userId;
  const AcessLevel = req.session.AcessLevel;

  verificarLogin(userId, res);

  // Consulta para verificar se o usuário é um estudante
  const sqlEstudante = `SELECT id FROM estudante WHERE id = ?`;

  conn.query(sqlEstudante, [userId], function (err, dataEstudante) {
    if (err) {
      console.log(err);
      res.status(500).send("Erro ao buscar o tipo de usuário");
      return;
    }

    if (dataEstudante.length > 0) {
      // Lógica para estudante
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

        if (dataTurma.length > 0) {
          const nomeTurma = dataTurma[0].nomeTurma;

          // Consulta para obter o nome do professor da turma
          const sqlProfessorTurma = `
            SELECT usuario.nome AS nomeProfessor
            FROM turma
            INNER JOIN usuario ON turma.professor = usuario.id
            WHERE turma.nome = ?;
          `;

          conn.query(
            sqlProfessorTurma,
            [nomeTurma],
            function (err, dataProfessor) {
              if (err) {
                console.log(err);
                res.status(500).send("Erro ao buscar o professor da turma");
                return;
              }

              if (dataProfessor.length > 0) {
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

                    const sqlUserInfoPosition = `
                    SELECT e.avaliacao,
                           FIND_IN_SET(e.avaliacao, (SELECT GROUP_CONCAT(avaliacao ORDER BY avaliacao DESC) FROM estudante)) AS posicao
                    FROM estudante e
                    JOIN usuario u ON e.id = u.id
                    WHERE u.id = ?
                  `;
                    conn.query(
                      sqlUserInfoPosition,
                      [userId],
                      function (err, userPosition) {
                        if (err) {
                          console.log(
                            "Erro ao achar posição do ranking do usuário",
                            err
                          );
                          res
                            .status(500)
                            .send(
                              "Erro ao achar posição do ranking do usuário"
                            );
                          return;
                        }

                        res.render("areadeacesso", {
                          nomeUsuario,
                          imagemUsuario,
                          niveldeacessoUsuario,
                          nomeTurma,
                          nomeProfessor,
                          posicao: userPosition[0].posicao,
                          AcessLevel,
                          userId,
                        });
                      }
                    );
                  } else {
                    res.status(401).send("Usuário não encontrado");
                  }
                });
              } else {
                res.status(404).send("Professor não encontrado para a turma");
              }
            }
          );
        } else {
          res.status(404).send("Turma não encontrada para o estudante");
        }
      });
    } else {
      // Verificar se o usuário é um funcionário
      const sqlFuncionario = `SELECT id FROM funcionario WHERE id = ?`;

      conn.query(sqlFuncionario, [userId], function (err, dataFuncionario) {
        if (err) {
          console.log(err);
          res.status(500).send("Erro ao buscar o tipo de usuário");
          return;
        }

        if (dataFuncionario.length > 0) {
          // Lógica para funcionário
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

              res.render("areadeacesso", {
                nomeUsuario,
                imagemUsuario,
                niveldeacessoUsuario,
                AcessLevel,
                userId,
              });
            } else {
              res.status(401).send("Usuário não encontrado");
            }
          });
        } else {
          res.status(401).send("Tipo de usuário não reconhecido");
        }
      });
    }
  });
});

app.get("/registro", (req, res) => {
  const userId = req.session.userId;

  verificarLogin(userId, res);

  const AcessLevel = req.session.AcessLevel;
  if (AcessLevel <= 2) {
    errorPage(permissionError, res);
    return;
  }

  res.render("registro", { AcessLevel });
});

app.get("/criarTurma", (req, res) => {
  const userId = req.session.userId;

  verificarLogin(userId, res);

  const AcessLevel = req.session.AcessLevel;
  if (AcessLevel <= 2) {
    errorPage(permissionError, res);
    return;
  }

  const sqlProfessores = `SELECT usuario.nome FROM usuario INNER JOIN funcionario ON funcionario.id = usuario.id WHERE funcionario.tipo = "Professor"; `;

  conn.query(sqlProfessores, function (err, dataProfessores) {
    if (err) {
      console.log(err);
      res.status(500).send("Erro ao buscar professores");
      return;
    }

    const listaProfessores = dataProfessores;

    res.render("criarTurma", { listaProfessores });
  }
  );
});

// Fazer Login
app.post("/loginV", (req, res) => {
  const emailUsuario = req.body.email;
  const senhaUsuario = req.body.senha;

  const sql = `SELECT id FROM usuario WHERE usuario.email = ? AND usuario.senha = ?`;
  conn.query(sql, [emailUsuario, senhaUsuario], function (err, data) {
    if (err) {
      errorPageConsole("Erro ao buscar usuário", err, res);
      return;
    }

    if (data.length > 0) {
      const userId = data[0].id;
      req.session.userId = userId; // Declarando a váriavel de id do usuário na Sessão

      const nivel = `SELECT niveldeacesso FROM usuario WHERE usuario.id = ?`;

      conn.query(nivel, [userId], function (err, result) {
        if (err) {
          errorPageConsole("Erro ao buscar usuário", err, res);
          return;
        }

        if (result.length > 0) {
          let AcessLevel;
          switch (result[0].niveldeacesso) {
            case "Acesso Básico":
              AcessLevel = 1;
              break;
            case "Acesso Pedagógico":
              AcessLevel = 2;
              break;
            case "Acesso Pedagógico Avançado":
              AcessLevel = 3;
              break;
            case "Administrativo Total":
              AcessLevel = 4;
              break;
            default:
              AcessLevel = 0; // Valor padrão caso não corresponda a nenhum nível conhecido
          }
          req.session.AcessLevel = AcessLevel; // Armazenando o nível de acesso na sessão

          res.redirect("/areadeacesso");
        } else {
          errorPageConsole("Usuário não encontrado", err, res);;
        }
      });
    } else {
      errorPageConsole("Credenciais inválidas", err, res);;
    }
  });
});

// Adicionar Pontos
app.post("/addPoints/:id", function (req, res) {
  const alunoId = req.session.userIdPoints;
  const pointsModifier = req.body.userPointsModifier;

  const sqlAtualizarPontos = `UPDATE estudante SET estudante.avaliacao = ? WHERE estudante.id = ?`;

  conn.query(sqlAtualizarPontos, [pointsModifier, alunoId], function (err) {
    if (err) {
      errorPageConsole("Erro ao atualizar pontuação do aluno", err, res);
      return;
    }

    res.redirect(`/areaturma`);
  });
});

// Registrar Turmas
app.post("/registroTurma", (req, res) => {
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
      errorPageConsole("Erro ao buscar ID do professor", err, res);;
      return;
    }

    if (result.length > 0) {
      const turmaProfessorId = result[0].id;

      const sqlInserirTurma = `INSERT INTO turma (nome, turno, materia, sala, capacidade, inicio, termino, professor, imagem) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      conn.query(
        sqlInserirTurma,
        [
          turmaNome,
          turmaTurno,
          turmaMateria,
          turmaSala,
          turmaCapacidade,
          turmaInicio,
          turmaTermino,
          turmaProfessorId,
          turmaImagem,
        ],
        function (err) {
          if (err) {
            errorPageConsole("Erro ao inserir turma", err, res);
            return;
          }

          res.redirect("/criarTurma");
        }
      );
    } else {
      errorPageConsole("Professor não encontrado", err, res);
    }
  });
});

// Registrar Usuários
app.post("/registro", (req, res) => {
  const userName = req.body.nome;
  const userEmail = req.body.email;
  const userSenha = req.body.senha;
  const userNivelDeAcesso = req.body.nivelacesso;
  const userImagem = req.body.imagem;
  const userTipo = req.body.tipo;

  // Verificar se o e-mail já existe no banco de dados
  const checkEmail = "SELECT * FROM usuario WHERE email = ?";
  conn.query(checkEmail, [userEmail], (err, results) => {
    if (err) {
      errorPageConsole("Erro ao verificar e-mail no banco de dados", err, res);
    }

    if (results.length > 0) {
      // E-mail já está em uso
      errorPageConsole("Email já está em uso!", err, res);
      return;
    }

    const sql =
      "INSERT INTO usuario (nome, email, senha, imagem, niveldeacesso) VALUES (?, ?, ?, ?, ?)";
    conn.query(
      sql,
      [userName, userEmail, userSenha, userImagem, userNivelDeAcesso],
      (err, results) => {
        if (err) {
          errorPageConsole("Erro ao criar usuário", err, res);
          return;
        }

        const userId = results.insertId;

        if (userTipo === "Estudante") {
          const sqlAddStudent = `INSERT INTO estudante(id, avaliacao) VALUES (?, 1)`;
          conn.query(sqlAddStudent, [userId], function (err) {
            if (err) {
              errorPageConsole("Erro ao cadastrar estudante", err, res);
              return;
            }
            res.redirect("/registro");
          });
        } else {
          const sqlAddFuncionario = `INSERT INTO funcionario(id, tipo) VALUES (?, ?)`;
          conn.query(sqlAddFuncionario, [userId, userTipo], function (err) {
            if (err) {
              errorPageConsole("Erro ao cadastrar funcionário", err, res);
              return;
            }
            res.redirect("/registro");
          });
        }
      }
    );
  });
});

// Colocar Aluno na Turma
app.post("/alunoTurma", (req, res) => {
  const emailAluno = req.body.email;
  const nomeTurma = req.body.Turma;

  const sqlBuscarAluno = `SELECT usuario.id FROM usuario INNER JOIN estudante ON usuario.id = estudante.id WHERE usuario.email = ? ;`;

  conn.query(sqlBuscarAluno, [emailAluno], function (err, result) {
    if (err) {
      errorPageConsole("Erro ao buscar ID do aluno", err, res);
      return;
    }

    if (result.length > 0) {
      const alunoId = result[0].id;

      const sqlBuscarTurma = `SELECT id FROM turma WHERE nome = ?`;

      conn.query(sqlBuscarTurma, [nomeTurma], function (err, result2) {
        if (err) {
          errorPageConsole("Erro ao buscar ID da turma", err, res);
          return;
        }

        if (result2.length > 0) {
          const turmaId = result2[0].id;

          // Atualizar a turma do aluno, independentemente se ele já está em uma ou não
          const sqlAtualizarAlunoNaTurma = `UPDATE estudante SET turma = ? WHERE id = ?`;

          conn.query(
            sqlAtualizarAlunoNaTurma,
            [turmaId, alunoId],
            function (err) {
              if (err) {
                errorPageConsole("Erro ao atualizar aluno na turma", err, res);
                return;
              }

              res.status(200).send("Aluno movido para a nova turma com sucesso");
            }
          );
        } else {
          errorPageConsole("Turma não encontrada", err, res);
          return;
        }
      });
    } else {
      errorPageConsole("Aluno não encontrado", err, res);
      return;
    }
  });
});

// Deletar Usuário
app.post("/deleteUsuario", (req, res) => {
  const nomeUser = req.body.nome;
  const emailUser = req.body.email;

  const sqlFindId = `SELECT id FROM usuario WHERE nome = ? AND email = ?`;

  conn.query(sqlFindId, [nomeUser, emailUser], function (err, dataId) {
    if (err) {
      errorPageConsole("Erro ao buscar ID do usuário", err, res);
      return;
    }

    if (dataId.length === 0) {
      errorPageConsole("Nenhum usuário encontrado com o nome e email fornecidos.", err, res);
      return;
    }

    const userId = dataId[0].id;

    // Excluir registros de elogio relacionados ao usuário
    const sqlDeleteElogio = `DELETE FROM elogio WHERE elogiado_id = ?`;

    conn.query(sqlDeleteElogio, [userId], function (err, result) {
      if (err) {
        errorPageConsole("Erro ao excluir registros de elogio", err, res);
        return;
      }

      // Excluir registros de reclamação relacionados ao usuário
      const sqlDeleteReclamacao = `DELETE FROM reclamacao WHERE reclamado_id = ? OR reclamador_id = ?`;

      conn.query(sqlDeleteReclamacao, [userId, userId], function (err, result) {
        if (err) {
          errorPageConsole("Erro ao excluir registros de reclamação", err, res);
          return;
        }

        // Excluir o usuário
        const sqlDeleteUsuario = `DELETE FROM usuario WHERE id = ?`;

        conn.query(sqlDeleteUsuario, [userId], function (err, result) {
          if (err) {
            errorPageConsole("Erro ao excluir usuário", err, res);
            return;
          }

          console.log("Usuário e registros relacionados excluídos com sucesso.");
          res.redirect("/deletarUser");
        });
      });
    });
  });
});

// Adicionar Reclamação
app.post("/adicionarReclamacao/:id", (req, res) => {
  const userId = req.session.userId;
  const userAccessLevel = req.session.AcessLevel;
  const reclamadoId = req.params.id;
  const { tipo, descricao, gravidade } = req.body;

  if (!userId) {
    res.redirect("/login");
    return;
  }

  const sqlGetReclamado = `SELECT niveldeacesso FROM usuario WHERE id = ?`;

  conn.query(sqlGetReclamado, [reclamadoId], function (err, result) {
    if (err) {
      errorPageConsole("Erro ao buscar usuário reclamado", err, res);
      return;
    }

    if (result.length > 0) {
      const reclamadoAccessLevel = getAccessLevelIndex(result[0].niveldeacesso);

      if (userAccessLevel <= reclamadoAccessLevel) {
        errorPageConsole("Você não tem permissão para reclamar deste usuário.", err, res);
        return;
      }

      const sqlAdicionarReclamacao = `INSERT INTO reclamacao (reclamado_id, reclamador_id, tipo, descricao, gravidade) VALUES (?, ?, ?, ?, ?)`;

      conn.query(
        sqlAdicionarReclamacao,
        [reclamadoId, userId, tipo, descricao, gravidade],
        function (err) {
          if (err) {
            errorPageConsole("Erro ao adicionar reclamação", err, res);
            return;
          }

          res.status(200).send("Reclamação adicionada com sucesso");
        }
      );
    } else {
      errorPageConsole("Usuário reclamado não encontrado", err, res);
      return;
    }
  });
});

// Adicionar Elogio
app.post("/adicionarElogio/:id", (req, res) => {
  const userId = req.session.userId;
  const userAccessLevel = req.session.AcessLevel;
  const elogiadoId = req.params.id;
  const { descricao } = req.body;

  if (!userId) {
    res.redirect("/login");
    return;
  }

  const sqlGetElogiado = `SELECT niveldeacesso FROM usuario WHERE id = ?`;

  conn.query(sqlGetElogiado, [elogiadoId], function (err, result) {
    if (err) {
      errorPageConsole("Erro ao buscar usuário elogiado", err, res);
      return;
    }

    if (result.length > 0) {
      const elogiadoAccessLevel = getAccessLevelIndex(result[0].niveldeacesso);

      if (userAccessLevel <= elogiadoAccessLevel) {
        errorPageConsole("Você não tem permissão para elogiar este usuário.", err, res);
        return;
      }

      const sqlAdicionarElogio = `INSERT INTO elogio (elogiado_id, elogiador_id, descricao) VALUES (?, ?, ?)`;

      conn.query(
        sqlAdicionarElogio,
        [elogiadoId, userId, descricao],
        function (err) {
          if (err) {
            errorPageConsole("Erro ao adicionar elogio", err, res);
            return;
          }

          res.status(200).send("Elogio adicionado com sucesso");
        }
      );
    } else {
      errorPageConsole("Usuário elogiado não encontrado", err, res);
      return;
    }
  });
});

// Deletar Turma
app.post("/deletarTurmas", (req, res) => {
  const nomeTurma = req.body.nomeTurma;

  const sqlDeletarTurma = `DELETE FROM turma WHERE nome = ?`;

  conn.query(sqlDeletarTurma, [nomeTurma], function (err, result) {
    if (err) {
      console.log("Erro ao deletar turma:", err);
      return res.status(500).send("Erro ao deletar turma");
    }

    if (result.affectedRows > 0) {
      console.log("Turma deletada com sucesso");
      res.redirect("/areaturma");
    } else {
      console.log("Turma não encontrada");
      return res.status(404).send("Turma não encontrada");
    }
  });
});

// Área das Atualizações dos Usuários

// Atualizar nome do Usuário
app.post("/atualizarUserName", (req, res) => {
  const nomeUser = req.body.nome;
  const emailUser = req.body.email;

  const novoNome = req.body.NewName;

  const sqlFindId = `SELECT id FROM usuario WHERE nome = ? AND email = ?`;

  conn.query(sqlFindId, [nomeUser, emailUser], function (err, dataId) {
    if (err) {
      console.log("Erro ao tentar encontrar id do usuário: " + err);
      return res.status(500).send("Erro ao buscar ID do usuário");
    }

    if (dataId.length > 0) {
      const foundID = dataId[0].id;

      const sqlUpdateUserName = `UPDATE usuario SET usuario.nome = "${novoNome}" WHERE usuario.id = ${foundID} `;
      conn.query(sqlUpdateUserName, function (err) {
        if (err) {
          console.log("Erro ao tentar atualizar nome do Usuário: " + err);
          return res.status(500).send("Erro ao atualizar nome do Usuário");
        }

        res.redirect("/atualizarUser");
      });
    } else {
      console.log("Nenhum usuário encontrado com o nome e email fornecidos");
      return res.status(404).send("Usuário não encontrado");
    }
  });
});

// Atualizar email do Usuário
app.post("/atualizarUserEmail", (req, res) => {
  const nomeUser = req.body.nome;
  const emailUser = req.body.email;

  const novoEmail = req.body.NewEmail;

  const sqlFindId = `SELECT id FROM usuario WHERE nome = ? AND email = ?`;

  conn.query(sqlFindId, [nomeUser, emailUser], function (err, dataId) {
    if (err) {
      console.log("Erro ao tentar encontrar id do usuário: " + err);
      return res.status(500).send("Erro ao buscar ID do usuário");
    }

    if (dataId.length > 0) {
      const foundID = dataId[0].id;

      const sqlUpdateUserEmail = `UPDATE usuario SET usuario.email = "${novoEmail}" WHERE usuario.id = ${foundID} `;
      conn.query(sqlUpdateUserEmail, function (err) {
        if (err) {
          console.log("Erro ao tentar atualizar email do Usuário: " + err);
          return res.status(500).send("Erro ao atualizar email do Usuário");
        }

        res.redirect("/atualizarUser");
      });
    } else {
      console.log("Nenhum usuário encontrado com o nome e email fornecidos");
      return res.status(404).send("Usuário não encontrado");
    }
  });
});

// Atualizar senha do Usuário
app.post("/atualizarUserSenha", (req, res) => {
  const nomeUser = req.body.nome;
  const emailUser = req.body.email;

  const novaSenha = req.body.NewSenha;

  const sqlFindId = `SELECT id FROM usuario WHERE nome = ? AND email = ?`;

  conn.query(sqlFindId, [nomeUser, emailUser], function (err, dataId) {
    if (err) {
      console.log("Erro ao tentar encontrar id do usuário: " + err);
      return res.status(500).send("Erro ao buscar ID do usuário");
    }

    if (dataId.length > 0) {
      const foundID = dataId[0].id;

      const sqlUpdateUserSenha = `UPDATE usuario SET usuario.senha = "${novaSenha}" WHERE usuario.id = ${foundID} `;
      conn.query(sqlUpdateUserSenha, function (err) {
        if (err) {
          console.log("Erro ao tentar atualizar senha do Usuário: " + err);
          return res.status(500).send("Erro ao atualizar senha do Usuário");
        }

        res.redirect("/atualizarUser");
      });
    } else {
      console.log("Nenhum usuário encontrado com o nome e email fornecidos");
      return res.status(404).send("Usuário não encontrado");
    }
  });
});

// Autalizar imagem do usuário
app.post("/atualizarUserImagem", (req, res) => {
  const nomeUser = req.body.nome;
  const emailUser = req.body.email;

  const novaImagem = req.body.NewImagem;

  const sqlFindId = `SELECT id FROM usuario WHERE nome = ? AND email = ?`;

  conn.query(sqlFindId, [nomeUser, emailUser], function (err, dataId) {
    if (err) {
      console.log("Erro ao tentar encontrar id do usuário: " + err);
      return res.status(500).send("Erro ao buscar ID do usuário");
    }

    if (dataId.length > 0) {
      const foundID = dataId[0].id;

      const sqlUpdateUserImagem = `UPDATE usuario SET usuario.imagem = "${novaImagem}" WHERE usuario.id = ${foundID} `;
      conn.query(sqlUpdateUserImagem, function (err) {
        if (err) {
          console.log("Erro ao tentar atualizar imagem do Usuário: " + err);
          return res.status(500).send("Erro ao atualizar imagem do Usuário");
        }

        res.redirect("/atualizarUser");
      });
    } else {
      console.log("Nenhum usuário encontrado com o nome e email fornecidos");
      return res.status(404).send("Usuário não encontrado");
    }
  });
});

// Autalizar nível de acesso do Usuário
app.post("/atualizarUserNivelDeAcesso", (req, res) => {
  const nomeUser = req.body.nome;
  const emailUser = req.body.email;

  const novoNivelDeAcesso = req.body.newNivelacesso;

  const sqlFindId = `SELECT id FROM usuario WHERE nome = ? AND email = ?`;

  conn.query(sqlFindId, [nomeUser, emailUser], function (err, dataId) {
    if (err) {
      console.log("Erro ao tentar encontrar id do usuário: " + err);
      return res.status(500).send("Erro ao buscar ID do usuário");
    }

    if (dataId.length > 0) {
      const foundID = dataId[0].id;

      const sqlUpdateUserNivelDeAcesso = `UPDATE usuario SET usuario.niveldeacesso = "${novoNivelDeAcesso}" WHERE usuario.id = ${foundID} `;
      conn.query(sqlUpdateUserNivelDeAcesso, function (err) {
        if (err) {
          console.log(
            "Erro ao tentar atualizar nível de acesso do Usuário: " + err
          );
          return res
            .status(500)
            .send("Erro ao atualizar nível de acesso do Usuário");
        }
        res.redirect("/atualizarUser");
      });
    } else {
      console.log("Nenhum usuário encontrado com o nome e email fornecidos");
      return res.status(404).send("Usuário não encontrado");
    }
  });
});

// Atualizar Nome da Turma
app.post("/atualizarNomeTurma", (req, res) => {
  const nomeTurma = req.body.nome;
  const novoNome = req.body.novoNome;

  const sqlBuscarId = `SELECT id FROM turma WHERE nome = ?`;

  conn.query(sqlBuscarId, [nomeTurma], function (err, result) {
    if (err) {
      console.log("Erro ao buscar ID da turma:", err);
      return res.status(500).send("Erro ao buscar ID da turma");
    }

    if (result.length > 0) {
      const turmaId = result[0].id;

      const sqlAtualizarNome = `UPDATE turma SET nome = ? WHERE id = ?`;

      conn.query(sqlAtualizarNome, [novoNome, turmaId], function (err) {
        if (err) {
          console.log("Erro ao atualizar nome da turma:", err);
          return res.status(500).send("Erro ao atualizar nome da turma");
        }

        res.redirect("/areaturma");
      });
    } else {
      console.log("Turma não encontrada");
      return res.status(404).send("Turma não encontrada");
    }
  });
});

// Atualizar Turno da Turma
app.post("/atualizarTurnoTurma", (req, res) => {
  const nomeTurma = req.body.nome;
  const novoTurno = req.body.novoTurno;

  const sqlBuscarId = `SELECT id FROM turma WHERE nome = ?`;

  conn.query(sqlBuscarId, [nomeTurma], function (err, result) {
    if (err) {
      console.log("Erro ao buscar ID da turma:", err);
      return res.status(500).send("Erro ao buscar ID da turma");
    }

    if (result.length > 0) {
      const turmaId = result[0].id;

      const sqlAtualizarTurno = `UPDATE turma SET turno = ? WHERE id = ?`;

      conn.query(sqlAtualizarTurno, [novoTurno, turmaId], function (err) {
        if (err) {
          console.log("Erro ao atualizar turno da turma:", err);
          return res.status(500).send("Erro ao atualizar turno da turma");
        }

        res.redirect("/areaturma");
      });
    } else {
      console.log("Turma não encontrada");
      return res.status(404).send("Turma não encontrada");
    }
  });
});

// Atualizar Capacidade da Turma
app.post("/atualizarCapacidadeTurma", (req, res) => {
  const nomeTurma = req.body.nome;
  const novaCapacidade = req.body.novaCapacidade;

  const sqlBuscarId = `SELECT id FROM turma WHERE nome = ?`;

  conn.query(sqlBuscarId, [nomeTurma], function (err, result) {
    if (err) {
      console.log("Erro ao buscar ID da turma:", err);
      return res.status(500).send("Erro ao buscar ID da turma");
    }

    if (result.length > 0) {
      const turmaId = result[0].id;

      const sqlAtualizarCapacidade = `UPDATE turma SET capacidade = ? WHERE id = ?`;

      conn.query(
        sqlAtualizarCapacidade,
        [novaCapacidade, turmaId],
        function (err) {
          if (err) {
            console.log("Erro ao atualizar capacidade da turma:", err);
            return res
              .status(500)
              .send("Erro ao atualizar capacidade da turma");
          }

          res.redirect("/areaturma");
        }
      );
    } else {
      console.log("Turma não encontrada");
      return res.status(404).send("Turma não encontrada");
    }
  });
});

// Atualizar Matéria da Turma
app.post("/atualizarMateriaTurma", (req, res) => {
  const nomeTurma = req.body.nome;
  const novaMateria = req.body.novaMateria;

  const sqlBuscarId = `SELECT id FROM turma WHERE nome = ?`;

  conn.query(sqlBuscarId, [nomeTurma], function (err, result) {
    if (err) {
      console.log("Erro ao buscar ID da turma:", err);
      return res.status(500).send("Erro ao buscar ID da turma");
    }

    if (result.length > 0) {
      const turmaId = result[0].id;

      const sqlAtualizarMateria = `UPDATE turma SET materia = ? WHERE id = ?`;

      conn.query(sqlAtualizarMateria, [novaMateria, turmaId], function (err) {
        if (err) {
          console.log("Erro ao atualizar matéria da turma:", err);
          return res.status(500).send("Erro ao atualizar matéria da turma");
        }

        res.redirect("/areaturma");
      });
    } else {
      console.log("Turma não encontrada");
      return res.status(404).send("Turma não encontrada");
    }
  });
});

// Atualizar Sala da Turma
app.post("/atualizarSalaTurma", (req, res) => {
  const nomeTurma = req.body.nome;
  const novaSala = req.body.novaSala;

  const sqlBuscarId = `SELECT id FROM turma WHERE nome = ?`;

  conn.query(sqlBuscarId, [nomeTurma], function (err, result) {
    if (err) {
      console.log("Erro ao buscar ID da turma:", err);
      return res.status(500).send("Erro ao buscar ID da turma");
    }

    if (result.length > 0) {
      const turmaId = result[0].id;

      const sqlAtualizarSala = `UPDATE turma SET sala = ? WHERE id = ?`;

      conn.query(sqlAtualizarSala, [novaSala, turmaId], function (err) {
        if (err) {
          console.log("Erro ao atualizar sala da turma:", err);
          return res.status(500).send("Erro ao atualizar sala da turma");
        }

        res.redirect("/areaturma");
      });
    } else {
      console.log("Turma não encontrada");
      return res.status(404).send("Turma não encontrada");
    }
  });
});

// Atualizar Inicio da Turma
app.post("/atualizarInicioTurma", (req, res) => {
  const nomeTurma = req.body.nome;
  const novoInicio = req.body.novoInicio;

  const sqlBuscarId = `SELECT id FROM turma WHERE nome = ?`;

  conn.query(sqlBuscarId, [nomeTurma], function (err, result) {
    if (err) {
      console.log("Erro ao buscar ID da turma:", err);
      return res.status(500).send("Erro ao buscar ID da turma");
    }

    if (result.length > 0) {
      const turmaId = result[0].id;

      const sqlAtualizarInicio = `UPDATE turma SET inicio = ? WHERE id = ?`;

      conn.query(sqlAtualizarInicio, [novoInicio, turmaId], function (err) {
        if (err) {
          console.log("Erro ao atualizar início da turma:", err);
          return res.status(500).send("Erro ao atualizar início da turma");
        }

        res.redirect("/areaturma");
      });
    } else {
      console.log("Turma não encontrada");
      return res.status(404).send("Turma não encontrada");
    }
  });
});

// Autalizar Término da Turma
app.post("/atualizarTerminoTurma", (req, res) => {
  const nomeTurma = req.body.nome;
  const novoTermino = req.body.novoTermino;

  const sqlBuscarId = `SELECT id FROM turma WHERE nome = ?`;

  conn.query(sqlBuscarId, [nomeTurma], function (err, result) {
    if (err) {
      console.log("Erro ao buscar ID da turma:", err);
      return res.status(500).send("Erro ao buscar ID da turma");
    }

    if (result.length > 0) {
      const turmaId = result[0].id;

      const sqlAtualizarTermino = `UPDATE turma SET termino = ? WHERE id = ?`;

      conn.query(sqlAtualizarTermino, [novoTermino, turmaId], function (err) {
        if (err) {
          console.log("Erro ao atualizar término da turma:", err);
          return res.status(500).send("Erro ao atualizar término da turma");
        }

        res.redirect("/areaturma");
      });
    } else {
      console.log("Turma não encontrada");
      return res.status(404).send("Turma não encontrada");
    }
  });
});

// Atualizar Professor
app.post("/atualizarProfessorTurma", (req, res) => {
  const nomeTurma = req.body.nome;
  const nomeNovoProfessor = req.body.novoProfessor;

  const sqlBuscarIdProfessor = `SELECT id FROM usuario WHERE nome = ? AND id IN (SELECT id FROM funcionario WHERE tipo = 'Professor')`;

  conn.query(sqlBuscarIdProfessor, [nomeNovoProfessor], function (err, resultProfessor) {
    if (err) {
      console.log("Erro ao buscar ID do professor:", err);
      return res.status(500).send("Erro ao buscar ID do professor");
    }

    if (resultProfessor.length > 0) {
      const idNovoProfessor = resultProfessor[0].id;

      const sqlBuscarIdTurma = `SELECT id FROM turma WHERE nome = ?`;

      conn.query(sqlBuscarIdTurma, [nomeTurma], function (err, resultTurma) {
        if (err) {
          console.log("Erro ao buscar ID da turma:", err);
          return res.status(500).send("Erro ao buscar ID da turma");
        }

        if (resultTurma.length > 0) {
          const idTurma = resultTurma[0].id;

          const sqlAtualizarProfessorTurma = `UPDATE turma SET professor = ? WHERE id = ?`;

          conn.query(sqlAtualizarProfessorTurma, [idNovoProfessor, idTurma], function (err) {
            if (err) {
              console.log("Erro ao atualizar professor da turma:", err);
              return res.status(500).send("Erro ao atualizar professor da turma");
            }

            res.redirect("/areaturma");
          });
        } else {
          console.log("Turma não encontrada");
          return res.status(404).send("Turma não encontrada");
        }
      });
    } else {
      console.log("Professor não encontrado");
      return res.status(404).send("Professor não encontrado");
    }
  });
});

// Atualizar Imagem da Turma
app.post("/atualizarImagemTurma", (req, res) => {
  const nomeTurma = req.body.nome;
  const novaImagem = req.body.novaImagem;

  const sqlAtualizarImagemTurma = `
    UPDATE turma 
    SET imagem = ?
    WHERE nome = ?
  `;

  conn.query(sqlAtualizarImagemTurma, [novaImagem, nomeTurma], (err, result) => {
    if (err) {
      console.error("Erro ao atualizar a imagem da turma:", err);
      return res.status(500).send("Erro ao atualizar a imagem da turma.");
    }

    if (result.affectedRows === 0) {
      return res.status(404).send("Turma não encontrada ou nenhum registro foi afetado.");
    }

    res.redirect("/areaturma");
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
