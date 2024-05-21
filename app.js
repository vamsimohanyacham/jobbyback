const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const cors = require('cors')
const jwt = require('jsonwebtoken')

const app = express()
app.use(cors())
app.use(express.json())

const dbPath = path.join(__dirname, 'app.db')
let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(process.env.PORT || 9000, () => {
      console.log(
        `Server Running at http://localhost:${process.env.PORT || 9000}/`,
      )
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

function generateToken(user) {
  const payload = {
    name: user.name,
    password: user.password,
  }
  const token = jwt.sign(payload, 'your_secret_key', {expiresIn: '30d'})
  return token
}

app.post('/signin/', async (request, response) => {
  const {name, password} = request.body
  const existingUser = await db.get('SELECT * FROM user WHERE name = ?', [name])
  if (existingUser) {
    return response.status(400).json({error: 'User already exists'})
  }
  await db.run('INSERT INTO user (name, password) VALUES (?, ?)', [
    name,
    password,
  ])
  response.status(201).json({message: 'User created successfully'})
})

app.post('/login/', async (req, res) => {
  const {name, password} = req.body
  if (!name || !password) {
    return res.status(400).json({error: 'Name and password are required'})
  }
  const user = await db.get(
    'SELECT * FROM user WHERE name = ? AND password = ?',
    [name, password],
  )
  if (user) {
    const jwtToken = generateToken(user)
    return res.json({token: jwtToken})
  } else {
    return res.status(404).json({error: 'User not found'})
  }
})

app.get('/', async (req, res) => {
  const users = await db.all('SELECT * FROM user')
  res.json(users)
})
