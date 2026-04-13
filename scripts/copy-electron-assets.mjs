import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const sourceDir = path.join(projectRoot, 'src', 'electron', 'sql')
const targetDir = path.join(projectRoot, 'dist-electron', 'electron', 'sql')

async function copyRecursive(source, target) {
  const entries = await fs.readdir(source, { withFileTypes: true })
  await fs.mkdir(target, { recursive: true })

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name)
    const targetPath = path.join(target, entry.name)

    if (entry.isDirectory()) {
      await copyRecursive(sourcePath, targetPath)
      continue
    }

    await fs.copyFile(sourcePath, targetPath)
  }
}

await copyRecursive(sourceDir, targetDir)
