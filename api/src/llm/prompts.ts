import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

export type PromptRole = 'draft-expression' | 'tutor-first-message' | 'tutor-reply' | 'assessment'

/** The Lambda bundle carries the prompts next to the handler, so the path is set in the environment there. */
const directory = process.env.PROMPTS_DIR ?? fileURLToPath(new URL('../../prompts', import.meta.url))

const cache = new Map<PromptRole, string>()

export const loadPrompt = (role: PromptRole): string => {
  const cached = cache.get(role)
  if (cached) return cached

  const template = readFileSync(join(directory, `${role}.md`), 'utf8')
  cache.set(role, template)

  return template
}

export const renderPrompt = (template: string, values: Record<string, string | undefined>): string =>
  template
    .replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, name: string, body: string) => (values[name] ? body : ''))
    .replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
      const value = values[name]
      if (value === undefined) throw new Error(`No value for prompt placeholder ${name}`)

      return value
    })
