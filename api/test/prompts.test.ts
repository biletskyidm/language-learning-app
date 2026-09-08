import { describe, expect, it } from 'vitest'
import { loadPrompt, renderPrompt } from '../src/llm/prompts'

describe('renderPrompt', () => {
  it('puts every value in place of its placeholder', () => {
    expect(renderPrompt('Draft {{text}} for {{who}}', { text: 'cut corners', who: 'me' })).toBe(
      'Draft cut corners for me',
    )
  })

  it('fails loudly when a placeholder has no value', () => {
    expect(() => renderPrompt('Draft {{text}}', {})).toThrow('text')
  })

  it('keeps an optional block when its value is there', () => {
    expect(renderPrompt('a{{#context}} in {{context}}{{/context}}', { context: 'a meeting' })).toBe(
      'a in a meeting',
    )
  })

  it('drops an optional block when its value is missing', () => {
    expect(renderPrompt('a{{#context}} in {{context}}{{/context}}', {})).toBe('a')
  })
})

describe('loadPrompt', () => {
  it('renders the draft-expression prompt with the expression under draft', () => {
    const rendered = renderPrompt(loadPrompt('draft-expression'), { text: 'cut corners' })

    expect(rendered).toContain('cut corners')
    expect(rendered).not.toContain('{{')
  })
})
