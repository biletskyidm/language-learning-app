import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { colors } from '../../theme/tokens'
import { ScoreBar, scoreBarWidth, scoreColor } from '../score-bar'

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

describe('scoreColor', () => {
  it('turns red at or below 3, amber up to 6, green above it', () => {
    expect(scoreColor(0)).toBe(colors.error)
    expect(scoreColor(3)).toBe(colors.error)
    expect(scoreColor(3.1)).toBe(colors.warn)
    expect(scoreColor(6)).toBe(colors.warn)
    expect(scoreColor(6.1)).toBe(colors.ok)
    expect(scoreColor(10)).toBe(colors.ok)
  })

  it('leaves an unpractised phrase uncoloured', () => {
    expect(scoreColor(undefined)).toBe(colors.border)
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
