import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { WeekChart } from '../week-chart'

describe('WeekChart', () => {
  it('labels each day from Monday to Sunday with its count', async () => {
    await render(<WeekChart week={[3, 0, 5, 1, 0, 0, 2]} today={2} />)

    expect(screen.getByLabelText('Mon: 3')).toBeTruthy()
    expect(screen.getByLabelText('Tue: 0')).toBeTruthy()
    expect(screen.getByLabelText('Wed: 5')).toBeTruthy()
    expect(screen.getByLabelText('Sun: 2')).toBeTruthy()
  })

  it('scales the tallest bar to the given height', async () => {
    await render(<WeekChart week={[3, 6, 0, 0, 0, 0, 0]} today={2} barHeight={90} />)

    expect(screen.getByTestId('bar-Tue')).toHaveStyle({ height: 90 })
    expect(screen.getByTestId('bar-Mon')).toHaveStyle({ height: 45 })
  })

  it('draws bars 120 high by default', async () => {
    await render(<WeekChart week={[3, 6, 0, 0, 0, 0, 0]} today={2} />)

    expect(screen.getByTestId('bar-Tue')).toHaveStyle({ height: 120 })
  })

  it('shows placeholder bars under the day labels while loading', async () => {
    jest.useFakeTimers()
    await render(<WeekChart today={2} />)

    expect(screen.getByText('Mon')).toBeTruthy()
    expect(screen.getByText('Sun')).toBeTruthy()
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThanOrEqual(7)
    expect(screen.queryByLabelText(/Mon: /)).toBeNull()
    jest.useRealTimers()
  })
})
