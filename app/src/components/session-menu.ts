import { ActionSheetIOS, Alert } from 'react-native'

const confirmCancel = (onCancel: () => void) =>
  Alert.alert('Cancel this session?', 'It stays in your history under Canceled, without a final assessment.', [
    { text: 'Keep going', style: 'cancel' },
    { text: 'Cancel session', style: 'destructive', onPress: onCancel },
  ])

export const openEndMenu = ({ onEnd, onCancel }: { onEnd: () => void; onCancel: () => void }) =>
  Alert.alert('End this session?', 'End sums it up with a final assessment. Cancel drops it without one.', [
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
