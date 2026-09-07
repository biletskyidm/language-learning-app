import { Stack, router, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, StyleSheet, Text } from 'react-native'
import { expressionPatch } from '../../../src/api/expression-patch'
import { useExpression } from '../../../src/api/use-expression'
import { useUpdateExpression } from '../../../src/api/use-update-expression'
import { ExpressionForm } from '../../../src/components/expression-form'
import { colors, spacing } from '../../../src/theme/tokens'

export default function EditExpressionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const expression = useExpression(id)
  const update = useUpdateExpression(id)
  const stored = expression.data

  return (
    <>
      <Stack.Screen options={{ title: 'Edit expression' }} />
      {expression.isPending ? <ActivityIndicator style={styles.state} /> : null}
      {expression.isError ? <Text style={styles.error}>Could not load this expression</Text> : null}
      {stored ? (
        <ExpressionForm
          initial={stored}
          pending={update.isPending}
          error={update.isError ? 'Could not save this expression' : undefined}
          onSubmit={(draft) => update.mutate(expressionPatch(stored, draft), { onSuccess: () => router.back() })}
        />
      ) : null}
    </>
  )
}

const styles = StyleSheet.create({
  state: { paddingVertical: spacing.lg },
  error: { color: colors.error, textAlign: 'center', paddingVertical: spacing.lg },
})
