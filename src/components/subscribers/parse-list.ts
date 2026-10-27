import type { NewSubscriber } from '@/utils/mailing-types'

// A pasted list or a CSV file, read into addresses and names. Takes one
// address per line, "Name <email>", or columns separated by commas, tabs or
// semicolons (email, first name, last name, in any order when the first line
// names them).

function splitColumns(line: string, separator: string): string[] {
  const cells: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        cell += '"'
        i++
      } else {
        quoted = !quoted
      }
    } else if (char === separator && !quoted) {
      cells.push(cell.trim())
      cell = ''
    } else {
      cell += char
    }
  }
  cells.push(cell.trim())
  return cells
}

function separatorOf(lines: string[]): string | null {
  const sample = lines.slice(0, 20).join('\n')
  for (const separator of ['\t', ';', ',']) {
    if (sample.includes(separator)) return separator
  }
  return null
}

const EMAIL_IN_TEXT = /[^\s<>(),;"']+@[^\s<>(),;"']+/

function fromLine(line: string): NewSubscriber {
  // Ann Smith <ann@example.com>, or "Smith, Ann" <ann@example.com>
  const angled = line.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
  if (angled) {
    const name = (angled[1] ?? '').trim()
    const [firstName = '', ...rest] = name.includes(',')
      ? name.split(',').map((part) => part.trim()).reverse()
      : name.split(/\s+/)
    return { email: (angled[2] ?? '').trim(), firstName, lastName: rest.join(' ') }
  }
  return { email: line.match(EMAIL_IN_TEXT)?.[0] ?? line.trim() }
}

export function parseList(text: string): NewSubscriber[] {
  const lines = text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length) return []

  const separator = separatorOf(lines)
  const angledOrPlain = lines.every((line) => /<[^>]+@[^>]+>/.test(line) || !separator)
  if (!separator || angledOrPlain) return lines.map(fromLine)

  const first = splitColumns(lines[0]!, separator).map((cell) => cell.toLowerCase())
  const named = first.some((cell) => /e-?mail/.test(cell)) && !first.some((cell) => cell.includes('@'))

  let emailAt = 0
  let firstAt = 1
  let lastAt = 2
  if (named) {
    emailAt = first.findIndex((cell) => /e-?mail/.test(cell))
    firstAt = first.findIndex((cell) => /first|given|^name$/.test(cell))
    lastAt = first.findIndex((cell) => /last|family|surname/.test(cell))
  }

  return (named ? lines.slice(1) : lines).map((line) => {
    const cells = splitColumns(line, separator)
    // A file without a header: the address is wherever the @ is.
    const at = named ? emailAt : Math.max(0, cells.findIndex((cell) => cell.includes('@')))
    const others = named ? [] : cells.filter((_, index) => index !== at)
    return {
      email: cells[at] ?? '',
      firstName: (named ? (firstAt >= 0 ? cells[firstAt] : '') : others[0]) ?? '',
      lastName: (named ? (lastAt >= 0 ? cells[lastAt] : '') : others[1]) ?? '',
    }
  })
}
