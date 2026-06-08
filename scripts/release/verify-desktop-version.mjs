#!/usr/bin/env node

import fs from 'node:fs/promises'

const packageJsonPath = new URL('../../apps/desktop/package.json', import.meta.url)
const tauriConfigPath = new URL('../../apps/desktop/src-tauri/tauri.conf.json', import.meta.url)
const cargoTomlPath = new URL('../../apps/desktop/src-tauri/Cargo.toml', import.meta.url)

const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'))
const tauriConfig = JSON.parse(await fs.readFile(tauriConfigPath, 'utf8'))
const cargoToml = await fs.readFile(cargoTomlPath, 'utf8')

const packageVersion = String(packageJson.version ?? '').trim()
const tauriVersion = String(tauriConfig.version ?? '').trim()
const cargoVersionMatch = cargoToml.match(/^version\s*=\s*"([^"]+)"\s*$/m)
const cargoVersion = String(cargoVersionMatch?.[1] ?? '').trim()

if (!packageVersion || !tauriVersion || !cargoVersion) {
  throw new Error('Missing desktop version in package.json, tauri.conf.json, or Cargo.toml')
}

if (packageVersion !== tauriVersion || packageVersion !== cargoVersion) {
  throw new Error(
    `Desktop version mismatch: package.json=${packageVersion}, tauri.conf.json=${tauriVersion}, Cargo.toml=${cargoVersion}`,
  )
}

console.log(`Desktop version verified: ${packageVersion}`)
