import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { colors } from '../../theme/tokens'
import { Score, scoreColor } from '../score'

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

describe('Score', () => {
  it('colours the number by its band', async () => {
    await render(<Score value={2} />)

    expect(screen.getByText('2.0')).toHaveStyle({ color: colors.error })
  })

  it('rounds to the asked precision', async () => {
    await render(<Score value={7} digits={0} />)

    expect(screen.getByText('7')).toBeTruthy()
  })

  it('shows a muted placeholder when there is no score', async () => {
    await render(<Score placeholder="—" />)

    expect(screen.getByText('—')).toHaveStyle({ color: colors.muted })
  })
})
