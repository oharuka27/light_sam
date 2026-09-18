import { readdir } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { spawnSync } from 'node:child_process'

const MODEL_ROOT = '.models'
const BUCKET = 'light-sam-models'

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await collectFiles(path))
    else if (entry.isFile()) files.push(path)
  }

  return files
}

for (const file of await collectFiles(MODEL_ROOT)) {
  const key = relative(MODEL_ROOT, file).split(sep).join('/')
  console.log(`upload: ${BUCKET}/${key}`)

  const result = spawnSync(
    'npx',
    ['wrangler', 'r2', 'object', 'put', `${BUCKET}/${key}`, '--file', file, '--remote'],
    { stdio: 'inherit' },
  )

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
