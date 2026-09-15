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
})
