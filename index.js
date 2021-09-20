const express = require('express')
const path = require('path')
const http = require('http')
const app = express()
const bodyParser = require('body-parser')
const Netmask = require('netmask').Netmask
const fs = require('fs')
const { join } = require('path')

app.set('port', 61439)
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))

app.post('/', (req, res) => {
  const authorizedIps = [
    '127.0.0.1',
    'localhost'
  ]
  const githubIps = [
    '207.97.227.253',
    '50.57.128.197',
    '204.232.175.75',
    '108.171.174.178'
  ]
  const payload = req.body

  if (!payload) {
    console.log('No payload')
    res.writeHead(400)
    res.end()
    return
  }

  const ipv4 = req.ip.replace('::ffff:', '')
  if (!(inAuthorizedSubnet(ipv4) || authorizedIps.indexOf(ipv4) >= 0 || githubIps.indexOf(ipv4) >= 0)) {
    console.log('Unauthorized IP:', req.ip, '(', ipv4, ')')
    res.writeHead(403)
    res.end()
    return
  }
  const scriptPath = `./scripts/${payload.repository.name}-main.sh`
  const fullPath = `. ${join(__dirname, scriptPath)}`

  if (!fs.existsSync(fullPath)) return res.status(404).end()

  console.log(`Executing task at: ${scriptPath}`)

  try {
    myExec(fullPath)
  } catch (e) {
    return res.status(500).send(e)
  }

  res.writeHead(200)
  res.end()
})

http.createServer(app).listen(app.get('port'), function () {
  console.log('CI Ninja server listening on port ' + app.get('port'))
})

function myExec(line) {
  if (!fs.existsSync(line)) throw Error('This script doesn\'t exists')
  
  const exec = require('child_process').exec
  const execCallback = (error) => {
    if (error !== null) {
      throw error
    }
  }
  const proc = exec(line, execCallback)
  proc.stdout.pipe(process.stdout)
}

function inAuthorizedSubnet(ip) {
  const authorizedSubnet = [
    '192.30.252.0/22',
    '185.199.108.0/22',
    '140.82.112.0/20',
    '143.55.64.0/20'
  ].map(function (subnet) {
    return new Netmask(subnet)
  })
  return authorizedSubnet.some(function (subnet) {
    return subnet.contains(ip)
  })
}
