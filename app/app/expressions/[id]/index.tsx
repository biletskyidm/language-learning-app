import { Stack, router, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, Alert, ScrollView, StyleSheet } from 'react-native'
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
          <Stack.Toolbar.Menu icon="ellipsis" disabled={remove.isPending}>
            <Stack.Toolbar.MenuAction icon="pencil" onPress={() => router.push(`/expressions/${id}/edit`)}>
              Edit
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction icon="trash" destructive onPress={confirmDelete}>
              Delete
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      ) : null}
      {expression.isPending ? <ActivityIndicator style={styles.state} /> : null}
      {expression.isError ? <Text style={styles.error}>Could not load this expression</Text> : null}
      {expression.data ? (
        <>
          <ExpressionDetail expression={expression.data} />
          <ExpressionHistory id={id} />
          {remove.isError ? <Text style={styles.error}>Could not delete this expression</Text> : null}
        </>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: spacing.md },
  state: { paddingVertical: spacing.lg },
  error: { color: colors.error, textAlign: 'center', paddingVertical: spacing.lg },
})
