import { useState } from 'react'
import { Stack } from 'expo-router'
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native'
import { trainingStatusSchema, trainingTypeSchema } from '@contracts'
import { useTrainings, type TrainingFilters } from '../../src/api/use-trainings'
import { Chip } from '../../src/components/chip'
import { TRAINING_STATUS_NAMES, TRAINING_TYPE_NAMES, TrainingRow } from '../../src/components/training-row'
import { colors, spacing } from '../../src/theme/tokens'

export default function Sessions() {
  const [filters, setFilters] = useState<TrainingFilters>({})
  const trainings = useTrainings(filters)

  const empty = () => {
    if (trainings.isPending) return <ActivityIndicator style={styles.state} />
    if (trainings.isError) return <Text style={styles.error}>Could not load your sessions</Text>
    return <Text style={styles.state}>No sessions here yet</Text>
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Sessions' }} />
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="All" active={!filters.status} onPress={() => setFilters({ ...filters, status: undefined })} />
          {trainingStatusSchema.options.map((status) => (
            <Chip
              key={status}
              label={TRAINING_STATUS_NAMES[status]}
              active={filters.status === status}
              onPress={() => setFilters({ ...filters, status })}
            />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="All types" active={!filters.type} onPress={() => setFilters({ ...filters, type: undefined })} />
          {trainingTypeSchema.options.map((type) => (
            <Chip
              key={type}
              label={TRAINING_TYPE_NAMES[type]}
              active={filters.type === type}
              onPress={() => setFilters({ ...filters, type })}
            />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={trainings.data?.pages.flatMap((page) => page.items) ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TrainingRow training={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={empty()}
        ListFooterComponent={trainings.isFetchingNextPage ? <ActivityIndicator style={styles.state} /> : null}
        onEndReached={() => {
          if (trainings.hasNextPage && !trainings.isFetchingNextPage) trainings.fetchNextPage()
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, gap: spacing.sm },
  filters: { gap: spacing.sm },
  chips: { gap: spacing.sm, alignItems: 'center', paddingRight: spacing.md },
  separator: { height: 1, backgroundColor: colors.border },
  state: { color: colors.muted, textAlign: 'center', paddingVertical: spacing.lg },
  error: { color: colors.error, textAlign: 'center', paddingVertical: spacing.lg },
})
