const express = require('express');
const { v4: uuid } = require('uuid');
const moment = require('moment');

const app = express();
app.use(express.json());

let customers = [];

// Middlewares
function verifyIfAccountExistCPF(req, res, next) {
  const { cpf } = req.headers;

  const findCliente = customers.find(customer => customer.cpf === cpf);

  if (!findCliente) {
    return res.status(404).json({ error: 'Cliente não encontrado.' })
  }
  req.customer = findCliente;
  next();
  return req;
}

function getBalance(statement) {
  const balance = statement.reduce((acc, opration) => {
    if (opration.type === 'credito') {
      return acc + opration.amount
    } else {
      return acc - opration.amount
    }
  }, 0);

  return balance;
}

app.post('/account', (req, res) => {
  const { cpf, name } = req.body;

  const customerAlreadyExists = customers.some(customer => customer.cpf === cpf);

  if (customerAlreadyExists) {
    return res.status(400).json({ error: 'Já existe uma conta com esse CPF.' });
  }

  customers.push({
    id: uuid(),
    name,
    cpf,
    statement: [],
    total: 0
  });

  return res.status(201).json(customers);
});

app.get('/statement', verifyIfAccountExistCPF, (req, res) => {
  const { customer } = req;
  return res.status(200).json(customer.statement);
});

app.post('/statement/deposit', verifyIfAccountExistCPF, (req, res) => {
  const { customer } = req;
  const { description, amount } = req.body;
  const { statement } = customer;

  statement.push({
    description,
    amount,
    type: 'credito',
    created_at: new Date(),
  });

  customer.total = getBalance(statement);

  return res.status(201).json(customer);
});

app.post('/statement/withdraw', verifyIfAccountExistCPF, (req, res) => {
  const { customer } = req;
  const { amount } = req.body;
  const { statement } = customer;

  const balance = getBalance(statement);

  if (balance < amount) {
    return res.status(400).json({ error: 'Saldo insuficiente' });
  }

  statement.push({
    amount,
    type: 'debito',
    created_at: new Date(),
  });

  customer.total = balance - amount;

  return res.status(201).json(customer);
});

app.get('/statement/date', verifyIfAccountExistCPF, (req, res) => {
  const { date } = req.query;
  const { customer } = req;

  const formatDate = moment(date, 'DD/MM/YYYY').format('YYYY-DD-MM');

  const findStatement = customer.statement.filter(
    statement =>
      moment(statement.created_at, 'YYYY-DD-MM')
        .format('YYYY-DD-MM') == formatDate
  );
  
  if (findStatement.length === 0) {
    return res.status(404).json({ message: 'Nenhum lançamento encontrado.' })
  }

  return res.status(200).json(findStatement);
});

app.get('/account', (req, res) => {
  return res.status(200).json(customers);
});

app.put('/account', verifyIfAccountExistCPF, (req, res) => {
  const { customer } = req;
  const { name } = req.body;

  customer.name = name;

  return res.status(201).json(customer);
});

app.delete('/account', verifyIfAccountExistCPF, (req, res) => {
  const { customer } = req;

  const filterAccount = customers.filter(cust => cust.id !== customer.id);

  customers = filterAccount;

  res.status(200).json(customers);
});

app.listen(3333, () => {
  console.log('🚀 Server is running in http://localhost:3333');
});