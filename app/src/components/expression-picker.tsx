import { useState } from 'react'
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native'
import { Text, TextInput } from './themed'
import type { Expression } from '@contracts'
import { DEFAULT_FILTERS } from '../api/expression-filters'
import { useExpressions } from '../api/use-expressions'
import { colors, spacing } from '../theme/tokens'
import { SrsSummary } from './srs-summary'

type Props = {
  excludedIds: string[]
  onSelect: (expression: Expression) => void
  onClose: () => void
}

export const ExpressionPicker = ({ excludedIds, onSelect, onClose }: Props) => {
  const [search, setSearch] = useState('')
  const expressions = useExpressions({ ...DEFAULT_FILTERS, sort: 'nextTrainingAt', dir: 'asc', search })
  const items = (expressions.data?.items ?? []).filter((item) => !excludedIds.includes(item.id))

  const choose = (expression: Expression) => {
    onSelect(expression)
    onClose()
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" allowSwipeDismissal onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.grabber} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
        <View style={styles.header}>
          <View style={styles.search}>
            <Text style={styles.searchIcon} accessibilityElementsHidden importantForAccessibility="no">
              🔍
            </Text>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search your phrases"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Search your phrases"
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={8}
            style={styles.close}
          >
            <Text style={styles.closeLabel}>✕</Text>
          </Pressable>
        </View>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="on-drag"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => choose(item)}
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${item.expression}, ${item.meaning}`}
              accessibilityHint="Adds it to this session"
            >
              <Text style={styles.expression}>{item.expression}</Text>
              <Text style={styles.meaning} numberOfLines={2}>
                {item.meaning}
              </Text>
              <SrsSummary expression={item} now={new Date()} style={styles.stats} />
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            expressions.isPending ? (
              <ActivityIndicator style={styles.state} />
            ) : (
              <Text style={styles.state}>
                {expressions.isError ? 'Could not load your vocabulary' : 'Nothing matches that'}
              </Text>
            )
          }
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm + 4,
    backgroundColor: colors.surface,
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.bubble,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  searchIcon: { fontSize: 14, opacity: 0.6 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 16 },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.bubble,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  option: { paddingVertical: spacing.sm + 2, gap: 2 },
  pressed: { backgroundColor: colors.bubble },
  expression: { fontSize: 16, fontWeight: '600' },
  meaning: { color: colors.muted },
  stats: { color: colors.muted, fontSize: 12 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  state: { color: colors.muted, textAlign: 'center', paddingVertical: spacing.lg },
})
