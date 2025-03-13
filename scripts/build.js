import { rmSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const flavors = ['commonjs', 'module']
const rmOptions = { recursive: true, force: true }
rmSync('types', rmOptions)

const { version } = JSON.parse(readFileSync('package.json', 'utf-8'))

const main = async () => await Promise.all(flavors.map(async (flavor) => {
  rmSync(flavor, rmOptions)
  execSync(`tsc -p tsconfig.${flavor}.json`)

  const json = JSON.stringify({ type: 'module' }, null, 2)
  writeFileSync(join(flavor, 'package.json'), json)

  const client = join(flavor, 'client.js')
  const js = readFileSync(client, 'utf-8').replace('<VERSION>', version)
  writeFileSync(client, js)
}))

main()
