import { useState } from 'react'
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useExpressionTags } from '../api/use-expression-tags'
import { colors, spacing } from '../theme/tokens'

type Props = {
  selected?: string
  onSelect: (tag?: string) => void
  onClose: () => void
}

/** The vocabulary carries hundreds of distinct tags, so the list is searched rather than scrolled. */
export const TagPicker = ({ selected, onSelect, onClose }: Props) => {
  const [search, setSearch] = useState('')
  const tags = useExpressionTags()
  const needle = search.trim().toLowerCase()
  const items = (tags.data?.items ?? []).filter((tag) => tag.toLowerCase().includes(needle))

  const choose = (tag?: string) => {
    onSelect(tag)
    onClose()
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Filter by tag</Text>
          <Pressable onPress={onClose} accessibilityRole="button">
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search tags"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <Pressable onPress={() => choose(undefined)} style={styles.option} accessibilityRole="button">
          <Text style={[styles.optionLabel, !selected && styles.optionSelected]}>Any tag</Text>
        </Pressable>
        <FlatList
          data={items}
          keyExtractor={(tag) => tag}
          keyboardDismissMode="on-drag"
          renderItem={({ item }) => (
            <Pressable onPress={() => choose(item)} style={styles.option} accessibilityRole="button">
              <Text style={[styles.optionLabel, item === selected && styles.optionSelected]}>{item}</Text>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            tags.isPending ? (
              <ActivityIndicator style={styles.state} />
            ) : (
              <Text style={styles.state}>{tags.isError ? 'Could not load tags' : 'No tag matches that'}</Text>
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
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
  },
  option: { paddingVertical: spacing.sm + 2 },
  optionLabel: { fontSize: 15 },
  optionSelected: { color: colors.ok, fontWeight: '600' },
  separator: { height: 1, backgroundColor: colors.border },
  state: { color: colors.muted, textAlign: 'center', paddingVertical: spacing.lg },
})
