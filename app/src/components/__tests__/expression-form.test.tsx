import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import type { CreateExpressionInput, ExpressionDraft } from '@contracts'
import { ExpressionForm } from '../expression-form'

jest.mock('expo-router', () => ({
  Stack: { Screen: ({ options }: { options: { headerRight: () => React.ReactNode } }) => options.headerRight() },
}))

const EXPRESSION = 'hit the nail on the head'
const MEANING = 'to describe exactly what is causing a problem'

const drafted: ExpressionDraft = {
  type: 'idiom',
  partOfSpeech: 'verb',
  meaning: 'to do something in the easiest, cheapest way',
  examples: ['They cut corners to ship on time.'],
  tags: ['work'],
  frequency: 'moderate',
}

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }

const renderForm = async (onFill: jest.Mock) => {
  const onSubmit = jest.fn<void, [CreateExpressionInput]>()
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ExpressionForm title="New expression" pending={false} onFill={onFill} onSubmit={onSubmit} />
    </SafeAreaProvider>,
  )

  return onSubmit
}

const type = (placeholder: string, value: string) =>
  fireEvent.changeText(screen.getByPlaceholderText(placeholder), value)

const valueOf = (placeholder: string) => screen.getByPlaceholderText(placeholder).props.value

describe('ExpressionForm with AI fill', () => {
  it('waits for an expression before it will draft anything', async () => {
    const onFill = jest.fn()
    await renderForm(onFill)

    await fireEvent.press(screen.getByText('Fill with AI'))

    expect(onFill).not.toHaveBeenCalled()
  })

  it('replaces the drafted fields with what the API returned, and saves them', async () => {
    const onFill = jest.fn().mockResolvedValue(drafted)
    const onSubmit = await renderForm(onFill)

    await type(EXPRESSION, 'cut corners')
    await type(MEANING, 'my own half-written guess')
    await fireEvent.press(screen.getByText('Fill with AI'))

    await waitFor(() => expect(onFill).toHaveBeenCalledWith('cut corners'))
    await waitFor(() => expect(valueOf(MEANING)).toBe(drafted.meaning))
    expect(valueOf(EXPRESSION)).toBe('cut corners')

    await fireEvent.press(screen.getByText('Save'))

    expect(onSubmit).toHaveBeenCalledWith({
      expression: 'cut corners',
      type: 'idiom',
      partOfSpeech: 'verb',
      meaning: drafted.meaning,
      examples: drafted.examples,
      tags: drafted.tags,
      frequency: 'moderate',
    })
  })

  it('locks the expression while the draft is in flight', async () => {
    let resolve: (draft: ExpressionDraft) => void = () => {}
    const onFill = jest.fn().mockReturnValue(new Promise<ExpressionDraft>((r) => (resolve = r)))
    await renderForm(onFill)

    await type(EXPRESSION, 'cut corners')
    const pressed = fireEvent.press(screen.getByText('Fill with AI'))

    await waitFor(() => expect(screen.getByPlaceholderText(EXPRESSION).props.editable).toBe(false))

    resolve(drafted)
    await act(async () => {
      await pressed
    })

    expect(valueOf(EXPRESSION)).toBe('cut corners')
    expect(screen.getByPlaceholderText(EXPRESSION).props.editable).toBe(true)
  })

  it('keeps what was typed and says so when the draft fails', async () => {
    const onFill = jest.fn().mockRejectedValue(new Error('502'))
    await renderForm(onFill)

    await type(EXPRESSION, 'cut corners')
    await type(MEANING, 'my own half-written guess')
    await fireEvent.press(screen.getByText('Fill with AI'))

    await waitFor(() => expect(screen.getByText('Could not draft this expression')).toBeTruthy())
    expect(valueOf(MEANING)).toBe('my own half-written guess')
  })
})
