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

describe('información de revisión de OpenAI (plugin.json)', () => {
  const manifest = json('plugin', 'plugin.json')
  const com = manifest.extensions['com.openai']
  const cases = com.review.test_cases

  it('review y publication están bajo com.openai, no dentro de interface', () => {
    expect(com.review).toBeDefined()
    expect(com.publication).toBeDefined()
    expect(com.interface.review).toBeUndefined()
    expect(com.interface.publication).toBeUndefined()
  })

  it('tiene exactamente 5 casos positivos y 3 negativos (lo que exige la revisión inicial de MCP)', () => {
    expect(cases.positive).toHaveLength(5)
    expect(cases.negative).toHaveLength(3)
  })

  it('cada caso positivo declara descripción, prompt, la herramienta real y el resultado esperado', () => {
    for (const c of cases.positive) {
      expect(c.description?.length, 'description').toBeGreaterThan(10)
      expect(c.prompt?.length, 'prompt').toBeGreaterThan(10)
      expect(c.tools_triggered).toBe(TOOL_NAME)
      expect(c.expected_behavior?.length, 'expected_behavior').toBeGreaterThan(40)
      expect(c.description.length).toBeLessThanOrEqual(4000)
    }
  })

  it('cada caso negativo declara descripción (con el motivo y lo esperado) y prompt', () => {
    for (const c of cases.negative) {
      expect(c.prompt?.length, 'prompt').toBeGreaterThan(10)
      expect(c.description?.length, 'description').toBeGreaterThan(40)
    }
  })

  it('los prompts de los casos positivos coinciden con las notas del conjunto de evaluación', () => {
    const doc = read('docs', 'evaluation-prompts.md')
    const notesFor = (id: string): string => {
      const start = doc.indexOf(`### ${id}.`)
      expect(start, `sección ${id} en evaluation-prompts.md`).toBeGreaterThan(-1)
      const quote: string[] = []
      for (const line of doc.slice(start).split('\n').slice(1)) {
        if (line.startsWith('>')) quote.push(line.replace(/^>\s?/, ''))
        else if (quote.length) break
      }
      return quote.join('\n')
    }
    ;['D1', 'D2', 'A1', 'A2', 'A3'].forEach((id, i) => {
      const prompt: string = cases.positive[i].prompt
      expect(prompt.split('\n\n').slice(1).join('\n\n'), `notas del caso ${id}`).toBe(notesFor(id))
    })
  })

  it('el caso 1 usa fechas inequívocas, para que sea un caso limpio', () => {
    const notes: string = cases.positive[0].prompt
    expect(notes).not.toMatch(/\bantes del? \d/i)
    expect(notes).toContain('el 20 de noviembre de 2026')
    expect(notes).toContain('el 18 de noviembre de 2026')
  })

  it('no hay prompts duplicados', () => {
    const prompts = [...cases.positive, ...cases.negative].map((c: any) => c.prompt)
    expect(new Set(prompts).size).toBe(prompts.length)
  })

  it('el ZIP rechaza credenciales e instrucciones para revisores: no deben estar en el paquete', () => {
    expect(JSON.stringify(manifest)).not.toMatch(/test_credentials|reviewer_instructions/)
  })

  it('los casos no contienen números de tarjeta ni datos restringidos', () => {
    const text = JSON.stringify(cases)
    expect(text).not.toMatch(/\b(?:\d[ -]?){13,19}\b/)
  })

  it('declara notas de versión y que no es un plugin de comercio', () => {
    expect(com.publication.release_notes.length).toBeGreaterThan(40)
    expect(com.review.commerce).toBe(false)
  })

  it('si hay URL del vídeo, es HTTPS (el vídeo es obligatorio para el envío, pero se añade tras grabarlo)', () => {
    const url = com.review.demo_recording_url
    if (url !== undefined) expect(url).toMatch(/^https:\/\//)
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

  it('los diagramas de arquitectura existen, están bien formados y se referencian desde el documento', () => {
    const svg = read('docs', 'diagrams', 'architecture.svg')
    expect(svg).toMatch(/^<svg[\s>]/)
    expect(svg).toContain('<title')
    expect(svg).toContain('<desc')
    expect(svg.trim().endsWith('</svg>')).toBe(true)
    const architecture = read('docs', 'architecture.md')
    expect(architecture).toContain('diagrams/architecture.svg')
    expect(architecture).toContain('```mermaid\nsequenceDiagram')
    expect(architecture).toContain(TOOL_NAME)
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
