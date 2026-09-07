import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { ExpressionSort, Frequency } from '@contracts'
import type { ExpressionFilters } from '../api/expression-filters'
import { colors, spacing } from '../theme/tokens'
import { TagPicker } from './tag-picker'

const FREQUENCIES: [Frequency, string][] = [
  ['very_common', 'very common'],
  ['common', 'common'],
  ['moderate', 'moderate'],
  ['uncommon', 'uncommon'],
  ['formal/academic', 'formal'],
]

const SORTS: [ExpressionSort, string][] = [
  ['createdAt', 'Created'],
  ['score', 'Score'],
  ['nextTrainingAt', 'Next due'],
  ['timesPracticed', 'Practiced'],
]

const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    style={[styles.chip, active && styles.chipActive]}
  >
    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
  </Pressable>
)

type Props = {
  filters: ExpressionFilters
  onChange: (filters: ExpressionFilters) => void
}

const toggle = <T,>(current: T | undefined, value: T) => (current === value ? undefined : value)

export const ExpressionFilterBar = ({ filters, onChange }: Props) => {
  const [picking, setPicking] = useState(false)

  return (
    <View style={styles.bar}>
      {picking ? (
        <TagPicker
          selected={filters.tag}
          onSelect={(tag) => onChange({ ...filters, tag })}
          onClose={() => setPicking(false)}
        />
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Chip label="Due now" active={filters.due} onPress={() => onChange({ ...filters, due: !filters.due })} />
        {FREQUENCIES.map(([value, label]) => (
          <Chip
            key={value}
            label={label}
            active={filters.frequency === value}
            onPress={() => onChange({ ...filters, frequency: toggle(filters.frequency, value) })}
          />
        ))}
        <Chip
          label={filters.tag ? `#${filters.tag}` : 'Tag…'}
          active={Boolean(filters.tag)}
          onPress={() => setPicking(true)}
        />
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Text style={styles.label}>Sort</Text>
        {SORTS.map(([value, label]) => (
          <Chip
            key={value}
            label={label}
            active={filters.sort === value}
            onPress={() => onChange({ ...filters, sort: value })}
          />
        ))}
        <Chip
          label={filters.dir === 'desc' ? '↓' : '↑'}
          active={false}
          onPress={() => onChange({ ...filters, dir: filters.dir === 'desc' ? 'asc' : 'desc' })}
        />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: { gap: spacing.sm },
  row: { gap: spacing.sm, alignItems: 'center', paddingRight: spacing.md },
  label: { color: colors.muted, fontSize: 12 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
  },
  chipActive: { borderColor: colors.ok, backgroundColor: colors.ok },
  chipLabel: { fontSize: 13, color: colors.muted },
  chipLabelActive: { color: '#fff', fontWeight: '600' },
})
