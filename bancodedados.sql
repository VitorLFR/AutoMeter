CREATE DATABASE IF NOT EXISTS Carometro;
USE Carometro;
CREATE TABLE usuario (
    id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    nome VARCHAR(100),
    email VARCHAR(70),
    senha VARCHAR(20),
    niveldeacesso ENUM("Administrativo Total", "Acesso Pedagógico Avançado", "Acesso Pedagógico", "Acesso Básico"),
    imagem VARCHAR (10000)
);	
CREATE TABLE funcionario (
    id int,
    tipo ENUM("Professor", "Coordenador", "Estudante", "Limpeza", "Cantina", "Secretaria", "Outro"),
    FOREIGN KEY (id) REFERENCES usuario(id) ON DELETE CASCADE
);
CREATE TABLE turma (
    id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    nome VARCHAR(100),
    turno ENUM("Manhã", "Tarde", "Noite"),
    materia VARCHAR(100),
    sala INT,
    capacidade INT,
    inicio DATE,
    termino DATE,
    professor int,
    imagem VARCHAR(10000),
    FOREIGN KEY (professor) REFERENCES usuario(id) ON DELETE CASCADE
);
CREATE TABLE estudante (
    id INT,
    turma int,
    avaliacao INT,
    FOREIGN KEY (id) REFERENCES usuario(id) ON DELETE CASCADE,
    FOREIGN KEY (turma) REFERENCES turma(id)
);
CREATE TABLE ranking (
    id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    Nome VARCHAR(100)
);
CREATE TABLE reclamacao (
    id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    reclamado_id INT,
    reclamador_id INT,
    tipo ENUM("Atraso", "Má conduta", "Não entregou atividade", "Outros"),
    descricao VARCHAR(300),
    gravidade ENUM("Pouco Grave", "Grave", "Muito Grave"),
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reclamado_id) REFERENCES usuario(id),
    FOREIGN KEY (reclamador_id) REFERENCES usuario(id) ON DELETE CASCADE
);
CREATE TABLE elogio (
    id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    elogiado_id INT,
    elogiador_id INT,
    descricao VARCHAR(300),
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (elogiado_id) REFERENCES usuario(id),
    FOREIGN KEY (elogiador_id) REFERENCES usuario(id) ON DELETE CASCADE
);
-- Exemplo de Adições
-- Inserir usuários
INSERT INTO usuario (nome, email, senha, niveldeacesso, imagem) 
VALUES 
  ('Admin', 'admin@example.com', 'senha123', 'Administrativo Total', 'https://cdn.pixabay.com/photo/2014/04/03/10/32/businessman-310819_1280.png'); -- Funcionário com acesso administrativo total