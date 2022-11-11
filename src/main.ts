import { dirname, importx } from '@discordx/importer'
import { Koa } from '@discordx/koa'
import { SQLiteManager } from './SQLiteManager.js'
import path from 'path'
import url from 'url'
import * as os from 'os'

async function run () {
  // The following syntax should be used in the commonjs environment
  //
  // await importx(__dirname + "/api/**/*.{ts,js}");

  // The following syntax should be used in the ECMAScript environment
  await importx(`${dirname(import.meta.url)}/api/**/*.{ts,js}`)

  // ************* rest api section: start **********

  // api: prepare server
  const server = new Koa()

  // api: need to build the api server first
  await server.build()

  const nets = os.networkInterfaces()
  const results: Record<string, string[]> = Object.create(null)

  for (const name of Object.keys(nets)) {
    if (nets[name] === undefined) {
      continue
    }
    // @ts-ignore why wtf
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
      // noinspection SuspiciousTypeOfGuard
      const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
      if (net.family === familyV4Value && !net.internal) {
        if (!results[name]) {
          results[name] = []
        }
        results[name].push(net.address)
      }
    }
  }

  // api: let's start the server now
  const port = process.env.PORT ?? 3000
  server.listen(port, () => {
    console.log(`api server started on ${port}`)
    console.log(`visit:`)
    console.log(`\t- http://localhost:${port}`)
    for (const name of Object.keys(results)) {
      for (const address of results[name]) {
        // noinspection HttpUrlsUsage
        console.log(`\t- http://${address}:${port}`)
      }
    }
    if (process.argv.includes('--populate')) {
      console.log('Populating database with test data')
      const pathToFileURL = url.pathToFileURL(path.join(process.cwd(), process.argv[process.argv.indexOf('--populate') + 1]))
      SQLiteManager.populateWithTestData(pathToFileURL).then(() => {
        console.log('Database has been populated with test data')
      })
    }
  })

  // ************* rest api section: end **********
}

run().then()
