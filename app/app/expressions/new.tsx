import { router } from 'expo-router'
import { ApiError } from '../../src/api/client'
import { useCreateExpression } from '../../src/api/use-create-expression'
import { useDraftExpression } from '../../src/api/use-draft-expression'
import { ExpressionForm } from '../../src/components/expression-form'

const failure = (error: unknown) => {
  if (error instanceof ApiError && error.code === 'DUPLICATE') return 'That expression is already in your vocabulary'
  return 'Could not save this expression'
}

export default function NewExpression() {
  const create = useCreateExpression()
  const fill = useDraftExpression()

  return (
    <ExpressionForm
      title="New expression"
      pending={create.isPending}
      error={create.isError ? failure(create.error) : undefined}
      onFill={fill.mutateAsync}
      onSubmit={(draft) =>
        create.mutate(draft, { onSuccess: (created) => router.replace(`/expressions/${created.id}`) })
      }
    />
  )
}
