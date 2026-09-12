import { ActionSheetIOS, Alert } from 'react-native'

const confirmCancel = (onCancel: () => void) =>
  Alert.alert('Cancel this session?', 'It stays in your history under Canceled, without a final assessment.', [
    { text: 'Keep going', style: 'cancel' },
    { text: 'Cancel session', style: 'destructive', onPress: onCancel },
  ])

const CHAT_ENDING = 'End sums it up with a final assessment. Cancel drops it without one.'

export const openEndMenu = ({
  onEnd,
  onCancel,
  ending = CHAT_ENDING,
}: {
  onEnd: () => void
  onCancel: () => void
  ending?: string
}) =>
  Alert.alert('End this session?', ending, [
    { text: 'End session', onPress: onEnd },
    { text: 'Cancel session', style: 'destructive', onPress: onCancel },
    { text: 'Keep going', style: 'cancel' },
  ])

export const openSessionMenu =(onCancel: () => void) =>
  ActionSheetIOS.showActionSheetWithOptions(
    { options: ['Cancel session', 'Close'], destructiveButtonIndex: 0, cancelButtonIndex: 1 },
    (index) => {
      if (index === 0) confirmCancel(onCancel)
    },
  )
