import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ALL_CODES, CODE_DEFINITIONS } from '../lib/mcp/codes'
import { LIMITS } from '../lib/mcp/limits'
import { SERVER_VERSION, TOOL_NAME } from '../lib/mcp/server'

const root = path.join(process.cwd(), '..')
const read = (...p: string[]) => fs.readFileSync(path.join(root, ...p), 'utf8')
const json = (...p: string[]) => JSON.parse(read(...p))

describe('coherencia del paquete del plugin con el servidor', () => {
  const manifest = json('plugin', 'plugin.json')
  const mcp = json('plugin', 'mcp.json')
  const skill = read('plugin', 'skills', 'reuniones-claras', 'SKILL.md')

  it('las versiones coinciden', () => {
    expect(manifest.version).toBe(SERVER_VERSION)
    expect(json('server', 'package.json').version).toBe(SERVER_VERSION)
  })

  it('mcp.json declara un servidor streamable-http sin autenticación en la ruta /mcp', () => {
    const server = Object.values<any>(mcp.mcpServers)[0]
    expect(server.type).toBe('streamable-http')
    expect(new URL(server.url).pathname).toBe('/mcp')
    expect(new URL(server.url).protocol).toBe('https:')
    expect(server.extensions['com.openai'].auth).toEqual({ type: 'none' })
  })

  it('las URL públicas del manifiesto no terminan en barra (el sitio redirige esas)', () => {
    const ui = manifest.extensions['com.openai'].interface
    for (const key of ['websiteURL', 'supportURL', 'privacyPolicyURL', 'termsOfServiceURL']) {
      expect(ui[key], key).toMatch(/^https:\/\/www\.numen\.la\/plugins\/reuniones-claras/)
      expect(ui[key], key).not.toMatch(/\/$/)
    }
  })

  it('la Skill conserva su metodología y llama a la herramienta con ese nombre', () => {
    expect(skill).toMatch(/^---\nname: reuniones-claras\n/)
    expect(skill).toContain(`\`${TOOL_NAME}\``)
    for (const rule of ['Do not invent.', 'Preserve certainty.', 'Do not promote proposals to decisions.', 'No false consensus.']) {
      expect(skill).toContain(rule)
    }
  })

  it('la Skill pide solo campos estructurados y evidencia breve, y no inventar valores', () => {
    expect(skill).toContain('never the full notes or the transcript')
    expect(skill).toContain(`at most ${LIMITS.MAX_EVIDENCE_CHARS} characters`)
    expect(skill).toMatch(/Never fill in a missing owner, date, status, decision or evidence/)
    expect(skill).toMatch(/not_started.*in_progress.*blocked.*completed.*cancelled/s)
  })

  it('no hay archivos de macOS ni ZIPs dentro del paquete', () => {
    const found: string[] = []
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name)
        if (e.isDirectory()) walk(full)
        else found.push(full)
      }
    }
    walk(path.join(root, 'plugin'))
    expect(found.filter((f) => /\.DS_Store|__MACOSX|\.zip$/.test(f))).toEqual([])
    expect(found.some((f) => f.endsWith('plugin.json'))).toBe(true)
  })
})

describe('documentación al día', () => {
  const codesDoc = read('docs', 'validation-codes.md')

  it('cada código de validación está documentado con su severidad', () => {
    for (const code of ALL_CODES) {
      const line = codesDoc.split('\n').find((l) => l.includes(`\`${code}\``))
      expect(line, `código ${code} sin documentar`).toBeDefined()
      expect(line).toContain(CODE_DEFINITIONS[code].severity)
    }
  })

  it('la documentación del contrato menciona los límites reales', () => {
    const contract = read('docs', 'mcp-contract.md')
    expect(contract).toContain(String(LIMITS.MAX_ITEMS_PER_LIST))
    expect(contract).toContain(String(LIMITS.MAX_DESCRIPTION_CHARS))
    expect(contract).toContain(String(LIMITS.MAX_EVIDENCE_CHARS))
    expect(contract).toContain(`${LIMITS.MAX_BODY_BYTES / 1024} KB`)
    expect(contract).toContain(TOOL_NAME)
  })
})
