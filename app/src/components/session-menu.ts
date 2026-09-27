import { ActionSheetIOS } from 'react-native'

export const openSessionMenu = ({ onEnd, onCancel }: { onEnd: () => void; onCancel: () => void }) =>
  ActionSheetIOS.showActionSheetWithOptions(
    { options: ['End session', 'Cancel session', 'Close'], destructiveButtonIndex: 1, cancelButtonIndex: 2 },
    (index) => {
      if (index === 0) onEnd()
      if (index === 1) onCancel()
    },
  )
