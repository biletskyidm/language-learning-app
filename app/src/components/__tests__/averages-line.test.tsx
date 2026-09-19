import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { colors } from '../../theme/tokens'
import { AveragesLine } from '../averages-line'

describe('AveragesLine', () => {
  it('lists the five averages with one decimal, each in its own band', async () => {
    await render(
      <AveragesLine
        averages={{
          contextCorrectness: 7,
          grammarAndSyntax: 8,
          vocabularyDiversity: 6.25,
          sentenceComplexity: 5,
          sentenceNaturalness: 7.5,
        }}
      />,
    )

    expect(screen.getByText('7.0')).toHaveStyle({ color: colors.ok })
    expect(screen.getByText('6.3')).toHaveStyle({ color: colors.ok })
    expect(screen.getByText('5.0')).toHaveStyle({ color: colors.warn })
    for (const label of ['Context', 'Grammar', 'Vocabulary', 'Complexity', 'Naturalness']) {
      expect(screen.getByText(new RegExp(label))).toBeTruthy()
    }
  })
})
