import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { DescribeVerdict } from '../describe-verdict'

const props = {
  expression: 'break the ice',
  description: 'start talking to strangers so everyone relaxes',
  verdict: { score: 8, feedback: 'Clear and complete.' },
  meaning: 'to ease tension at the start of a meeting',
  examples: ['He told a joke to break the ice.', 'Games break the ice.', 'Nobody knew how to start.'],
}

describe('DescribeVerdict', () => {
  it('shows the explanation, verdict, meaning and first example only', async () => {
    await render(<DescribeVerdict {...props} />)

    expect(screen.getByText(props.description)).toBeTruthy()
    expect(screen.getByText('8/10 · Solid')).toBeTruthy()
    expect(screen.getByText(props.verdict.feedback)).toBeTruthy()
    expect(screen.getByText(props.meaning)).toBeTruthy()
    expect(screen.getByText('break the ice', { exact: false })).toBeTruthy()
    expect(screen.queryByText('Games', { exact: false })).toBeNull()
    expect(screen.getByText('2 more examples')).toBeTruthy()
  })

  it('reveals the remaining examples on demand', async () => {
    await render(<DescribeVerdict {...props} />)

    await fireEvent.press(screen.getByText('2 more examples'))

    expect(screen.getByText('Games', { exact: false })).toBeTruthy()
    expect(screen.getByText('“Nobody knew how to start.”')).toBeTruthy()
    expect(screen.queryByText('2 more examples')).toBeNull()
  })

  it('marks a score under the pass line as shaky', async () => {
    await render(<DescribeVerdict {...props} verdict={{ score: 4, feedback: 'Too vague.' }} />)

    expect(screen.getByText('4/10 · Shaky')).toBeTruthy()
  })

  it('offers no expander when there is at most one example', async () => {
    await render(<DescribeVerdict {...props} examples={[]} />)

    expect(screen.queryByText(/more example/)).toBeNull()
  })
})
