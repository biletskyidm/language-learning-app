import { Stack, router, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet } from 'react-native'
import { Text } from '../../../src/components/themed'
import { useDeleteExpression } from '../../../src/api/use-delete-expression'
import { useExpression } from '../../../src/api/use-expression'
import { ExpressionDetail } from '../../../src/components/expression-detail'
import { ExpressionHistory } from '../../../src/components/expression-history'
import { colors, spacing } from '../../../src/theme/tokens'

export default function ExpressionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const expression = useExpression(id)
  const remove = useDeleteExpression(id)

  const confirmDelete = () =>
    Alert.alert('Delete this expression?', 'It will be gone from your vocabulary for good.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => remove.mutate(undefined, { onSuccess: () => router.back() }),
      },
    ])

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen
        options={{
          title: expression.data?.expression ?? 'Expression',
        }}
      />
      {expression.data ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button onPress={() => router.push(`/expressions/${id}/edit`)} disabled={remove.isPending}>
            Edit
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}
      {expression.isPending ? <ActivityIndicator style={styles.state} /> : null}
      {expression.isError ? <Text style={styles.error}>Could not load this expression</Text> : null}
      {expression.data ? (
        <>
          <ExpressionDetail expression={expression.data} />
          <ExpressionHistory id={id} />
          {remove.isError ? <Text style={styles.error}>Could not delete this expression</Text> : null}
          <Pressable
            onPress={confirmDelete}
            disabled={remove.isPending}
            accessibilityRole="button"
            style={styles.delete}
          >
            <Text style={styles.deleteLabel}>Delete</Text>
          </Pressable>
        </>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: spacing.md },
  state: { paddingVertical: spacing.lg },
  error: { color: colors.error, textAlign: 'center', paddingVertical: spacing.lg },
  delete: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  deleteLabel: { color: colors.error, fontSize: 16, fontWeight: '600' },
})
