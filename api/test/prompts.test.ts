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

  it('renders the tutor first message prompt with the context, style and targets', () => {
    const rendered = renderPrompt(loadPrompt('tutor-first-message'), {
      context: 'a scrum standup',
      style: 'informal',
      targets: '- break the ice\n- touch base',
    })

    expect(rendered).toContain('a scrum standup')
    expect(rendered).toContain('informal')
    expect(rendered).toContain('- break the ice')
    expect(rendered).toContain('- touch base')
    expect(rendered).not.toContain('{{')
  })

  it('renders the tutor reply prompt with the conversation so far and the new message', () => {
    const rendered = renderPrompt(loadPrompt('tutor-reply'), {
      context: 'a scrum standup',
      style: 'informal',
      targets: '- break the ice',
      history: 'assistant: How did yesterday go?\nuser: Slowly.',
      userContent: 'I broke the ice with the client.',
    })

    expect(rendered).toContain('assistant: How did yesterday go?')
    expect(rendered).toContain('user: Slowly.')
    expect(rendered).toContain('I broke the ice with the client.')
    expect(rendered).not.toContain('{{')
  })

  it('renders the assessment prompt with the targets, their meanings and what the tutor asked', () => {
    const rendered = renderPrompt(loadPrompt('assessment'), {
      context: 'a scrum standup',
      style: 'informal',
      targets: '- break the ice: to get a conversation started',
      userContent: 'I broke the ice with the client.',
      tutorMessage: 'How did the call go?',
    })

    expect(rendered).toContain('- break the ice: to get a conversation started')
    expect(rendered).toContain('How did the call go?')
    expect(rendered).toContain('I broke the ice with the client.')
    expect(rendered).not.toContain('{{')
  })

  it('drops the tutor question from the assessment prompt when there is none', () => {
    const rendered = renderPrompt(loadPrompt('assessment'), {
      context: 'a scrum standup',
      style: 'informal',
      targets: '- break the ice: to get a conversation started',
      userContent: 'I broke the ice with the client.',
      tutorMessage: undefined,
    })

    expect(rendered).not.toContain('The tutor just said')
    expect(rendered).not.toContain('{{')
  })

  it('renders the narrative prompt with the session averages and how each target went', () => {
    const rendered = renderPrompt(loadPrompt('narrative'), {
      contextCorrectness: '7.0',
      grammar: '8.0',
      vocabularyDiversity: '6.5',
      sentenceComplexity: '5.0',
      sentenceNaturalness: '7.5',
      targets: '- break the ice: used, avg score 8.0/10 (correct)\n- touch base: not used',
    })

    expect(rendered).toContain('Grammar: 8.0/10')
    expect(rendered).toContain('Sentence naturalness: 7.5/10')
    expect(rendered).toContain('- break the ice: used, avg score 8.0/10 (correct)')
    expect(rendered).toContain('- touch base: not used')
    expect(rendered).toContain('suggestedFocus')
    expect(rendered).not.toContain('{{')
  })

  it('drops the target section of the narrative prompt when the session had none', () => {
    const rendered = renderPrompt(loadPrompt('narrative'), {
      contextCorrectness: '7.0',
      grammar: '8.0',
      vocabularyDiversity: '6.5',
      sentenceComplexity: '5.0',
      sentenceNaturalness: '7.5',
      targets: '',
    })

    expect(rendered).not.toContain('Target expression results')
    expect(rendered).not.toContain('{{')
  })

  it('renders the gaps prompt with the expressions to blank out', () => {
    const rendered = renderPrompt(loadPrompt('gaps-generate'), { targets: '- break the ice\n- touch base' })

    expect(rendered).toContain('- break the ice')
    expect(rendered).toContain('- touch base')
    expect(rendered).toContain('___')
    expect(rendered).not.toContain('{{')
  })

  it('drops the target section of the tutor prompt when there is nothing to practice', () => {
    const rendered = renderPrompt(loadPrompt('tutor-first-message'), {
      context: 'a scrum standup',
      style: 'informal',
      targets: '',
    })

    expect(rendered).not.toContain('practicing')
    expect(rendered).not.toContain('{{')
  })
})
