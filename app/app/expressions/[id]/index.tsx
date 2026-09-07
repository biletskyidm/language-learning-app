import { Stack, router, useLocalSearchParams } from 'expo-router'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { useExpression } from '../../../src/api/use-expression'
import { ExpressionDetail } from '../../../src/components/expression-detail'
import { colors, spacing } from '../../../src/theme/tokens'

export default function ExpressionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const expression = useExpression(id)

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen
        options={{
          title: expression.data?.expression ?? 'Expression',
          headerRight: () =>
            expression.data ? (
              <Pressable onPress={() => router.push(`/expressions/${id}/edit`)} accessibilityRole="button" hitSlop={12}>
                <Text style={styles.edit}>Edit</Text>
              </Pressable>
            ) : null,
        }}
      />
      {expression.isPending ? <ActivityIndicator style={styles.state} /> : null}
      {expression.isError ? <Text style={styles.error}>Could not load this expression</Text> : null}
      {expression.data ? <ExpressionDetail expression={expression.data} /> : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: spacing.md },
  state: { paddingVertical: spacing.lg },
  error: { color: colors.error, textAlign: 'center', paddingVertical: spacing.lg },
  edit: { fontSize: 16 },
})
