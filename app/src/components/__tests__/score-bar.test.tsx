import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { ScoreBar, scoreBarWidth } from '../score-bar'

describe('scoreBarWidth', () => {
  it('maps a 0–10 score onto the bar width', () => {
    expect(scoreBarWidth(0)).toBe('0%')
    expect(scoreBarWidth(2.5)).toBe('25%')
    expect(scoreBarWidth(10)).toBe('100%')
  })

  it('clamps scores outside the scale', () => {
    expect(scoreBarWidth(-1)).toBe('0%')
    expect(scoreBarWidth(12)).toBe('100%')
  })

  it('draws an empty bar for a phrase never practiced', () => {
    expect(scoreBarWidth(undefined)).toBe('0%')
  })
})

describe('ScoreBar', () => {
  it('labels the score, or marks the phrase as new', async () => {
    await render(
      <>
        <ScoreBar score={6.25} />
        <ScoreBar />
      </>,
    )

    expect(screen.getByLabelText('Score 6.3 of 10')).toBeTruthy()
    expect(screen.getByLabelText('Not practiced yet')).toBeTruthy()
  })
})
