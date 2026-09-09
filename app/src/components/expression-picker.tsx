import { useState } from 'react'
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import type { Expression } from '@contracts'
import { DEFAULT_FILTERS } from '../api/expression-filters'
import { srsSummary } from '../api/expression-srs'
import { useExpressions } from '../api/use-expressions'
import { colors, spacing } from '../theme/tokens'
import { Chip } from './chip'
import { TagPicker } from './tag-picker'

type Props = {
  title: string
  excludedIds: string[]
  onSelect: (expression: Expression) => void
  onClose: () => void
}

export const ExpressionPicker = ({ title, excludedIds, onSelect, onClose }: Props) => {
  const [search, setSearch] = useState('')
  const [tag, setTag] = useState<string | undefined>(undefined)
  const [pickingTag, setPickingTag] = useState(false)
  const expressions = useExpressions({ ...DEFAULT_FILTERS, search, tag })
  const items = (expressions.data?.items ?? []).filter((item) => !excludedIds.includes(item.id))

  const choose = (expression: Expression) => {
    onSelect(expression)
    onClose()
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClose} accessibilityRole="button">
            <Text style={styles.done}>Cancel</Text>
          </Pressable>
        </View>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search expression or meaning"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <View style={styles.row}>
          <Chip label={tag ? `#${tag}` : 'Tag…'} active={Boolean(tag)} onPress={() => setPickingTag(true)} />
        </View>
        {pickingTag ? (
          <TagPicker selected={tag} onSelect={setTag} onClose={() => setPickingTag(false)} />
        ) : null}
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="on-drag"
          renderItem={({ item }) => (
            <Pressable onPress={() => choose(item)} style={styles.option} accessibilityRole="button">
              <Text style={styles.expression}>{item.expression}</Text>
              <Text style={styles.meaning}>{item.meaning}</Text>
              <Text style={styles.stats}>{srsSummary(item, new Date())}</Text>
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
  sheet: { flex: 1, padding: spacing.md, gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 17, fontWeight: '600' },
  done: { fontSize: 16, color: colors.ok, fontWeight: '600' },
  search: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  option: { paddingVertical: spacing.sm, gap: 2 },
  expression: { fontSize: 15, fontWeight: '600' },
  meaning: { color: colors.muted },
  stats: { color: colors.muted, fontSize: 12 },
  separator: { height: 1, backgroundColor: colors.border },
  state: { color: colors.muted, textAlign: 'center', paddingVertical: spacing.lg },
})
