import { ActionSheetIOS } from 'react-native'
import { TARGETS_SETTING, type Settings, type TrainingType } from '@contracts'

const MODES: [TrainingType, string][] = [
  ['chat', '💬  Chat'],
  ['describe', '🗣️  Describe it'],
  ['smuggle', '🎒  Smuggle'],
]

const phrases = (count: number) => `${count} ${count === 1 ? 'phrase' : 'phrases'}`

export const openPracticeSheet = (settings: Settings, onPick: (mode: TrainingType) => void) =>
  ActionSheetIOS.showActionSheetWithOptions(
    {
      title: 'Start practice',
      options: [...MODES.map(([mode, label]) => `${label} · ${phrases(settings[TARGETS_SETTING[mode]])}`), 'Cancel'],
      cancelButtonIndex: MODES.length,
    },
    (index) => {
      const picked = MODES[index]
      if (picked) onPick(picked[0])
    },
  )
