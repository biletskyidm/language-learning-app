import { useRef } from 'react'
import { Stack, router, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, StyleSheet, Text } from 'react-native'
import type { Expression } from '@contracts'
import { expressionPatch } from '../../../src/api/expression-patch'
import { useExpression } from '../../../src/api/use-expression'
import { useUpdateExpression } from '../../../src/api/use-update-expression'
import { ExpressionForm } from '../../../src/components/expression-form'
import { colors, spacing } from '../../../src/theme/tokens'

const TITLE = 'Edit expression'

export default function EditExpressionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const expression = useExpression(id)
  const update = useUpdateExpression(id)
  // Frozen at mount: the form's fields are, so diffing against a later refetch would send fields
  // the user never touched and clobber whatever changed the record underneath them.
  const baseline = useRef<Expression | undefined>(undefined)
  baseline.current ??= expression.data
  const stored = baseline.current

  if (!stored) {
    return (
      <>
        <Stack.Screen options={{ title: TITLE }} />
        {expression.isError ? (
          <Text style={styles.error}>Could not load this expression</Text>
        ) : (
          <ActivityIndicator style={styles.state} />
        )}
      </>
    )
  }

  return (
    <ExpressionForm
      title={TITLE}
      initial={stored}
      pending={update.isPending}
      error={update.isError ? 'Could not save this expression' : undefined}
      onSubmit={(draft) => update.mutate(expressionPatch(stored, draft), { onSuccess: () => router.back() })}
    />
  )
}

const styles = StyleSheet.create({
  state: { paddingVertical: spacing.lg },
  error: { color: colors.error, textAlign: 'center', paddingVertical: spacing.lg },
})
