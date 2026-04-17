#!/usr/bin/env node

import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const rootDir = process.cwd()
const includedExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md'])
const ignoredDirectories = new Set([
  '.git',
  '.next',
  'artifacts',
  'build',
  'coverage',
  'node_modules',
  'out',
  'playwright-report',
  'test-results',
])

const allowedDangerousHtmlFiles = new Set(['src/app/layout.tsx'])
const failures = []
const warnings = []

const trackedSourceRoots = ['src', 'public', '.github']
const standaloneFiles = ['package.json', 'next.config.ts']
const requiredFiles = ['README.md', 'docs/INCIDENT-RESPONSE-PLAN.md', 'docs/SECURITY-COMPLIANCE-IMPLEMENTATION.md']

const secretPatterns = [
  /sk_(live|test)_[A-Za-z0-9]+/g,
  /api[_-]?key\s*[:=]\s*['"`][^'"`\n]+['"`]/gi,
  /secret[_-]?key\s*[:=]\s*['"`][^'"`\n]+['"`]/gi,
  /password\s*[:=]\s*['"`][^'"`\n]+['"`]/gi,
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g,
]

const publicSecretNamePattern = /NEXT_PUBLIC_[A-Z0-9_]*(SECRET|TOKEN|PASSWORD|PRIVATE)/g

async function walk(directory) {
  const results = []
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue

    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      results.push(...(await walk(fullPath)))
      continue
    }

    if (!includedExtensions.has(path.extname(entry.name))) continue
    results.push(fullPath)
  }

  return results
}

async function fileExists(relativePath) {
  try {
    const filePath = path.join(rootDir, relativePath)
    const fileStats = await stat(filePath)
    return fileStats.isFile()
  } catch {
    return false
  }
}

function toRelative(filePath) {
  return path.relative(rootDir, filePath)
}

function addFailure(message) {
  failures.push(message)
}

function addWarning(message) {
  warnings.push(message)
}

function scanContent(relativePath, content) {
  if (!relativePath.startsWith('tests/')) {
    for (const pattern of secretPatterns) {
      if (pattern.test(content)) {
        addFailure(`Potential secret-like value detected in ${relativePath}.`)
        pattern.lastIndex = 0
      }
    }

    if (publicSecretNamePattern.test(content)) {
      addFailure(`Public environment variable name looks secret-bearing in ${relativePath}.`)
      publicSecretNamePattern.lastIndex = 0
    }
  }

  if (relativePath.startsWith('src/') && content.includes('console.log(')) {
    addWarning(`console.log found in source file ${relativePath}. Review before production release.`)
  }

  if (
    relativePath.startsWith('tests/') &&
    (content.includes('.only(') || content.includes('describe.only(') || content.includes('it.only(') || content.includes('test.only('))
  ) {
    addFailure(`Focused test detected in ${relativePath}.`)
  }

  if (
    content.includes('dangerouslySetInnerHTML') &&
    !allowedDangerousHtmlFiles.has(relativePath)
  ) {
    addWarning(`Review dangerouslySetInnerHTML usage in ${relativePath}.`)
  }
}

async function main() {
  for (const relativePath of requiredFiles) {
    if (!(await fileExists(relativePath))) {
      addFailure(`Required security/compliance file is missing: ${relativePath}`)
    }
  }

  const files = []
  for (const relativeRoot of trackedSourceRoots) {
    const fullRoot = path.join(rootDir, relativeRoot)
    try {
      files.push(...(await walk(fullRoot)))
    } catch {
      // Ignore missing optional directories.
    }
  }

  for (const relativePath of standaloneFiles) {
    const fullPath = path.join(rootDir, relativePath)
    if (await fileExists(relativePath)) {
      files.push(fullPath)
    }
  }

  for (const filePath of files) {
    const relativePath = toRelative(filePath)
    const content = await readFile(filePath, 'utf8')
    scanContent(relativePath, content)
  }

  if (warnings.length) {
    console.warn('Security predeploy warnings:')
    for (const warning of warnings) {
      console.warn(`- ${warning}`)
    }
  }

  if (failures.length) {
    console.error('Security predeploy checks failed:')
    for (const failure of failures) {
      console.error(`- ${failure}`)
    }
    process.exit(1)
  }

  console.log('Security predeploy checks passed.')
}

await main()
