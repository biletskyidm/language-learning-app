import { ActionSheetIOS, Alert } from 'react-native'
import { openSessionMenu } from '../session-menu'

const showSheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
const alert = jest.spyOn(Alert, 'alert')

const pickFromSheet = (label: string) => {
  const [[{ options }, onPick]] = showSheet.mock.calls
  onPick(options.indexOf(label))
}

describe('openSessionMenu', () => {
  beforeEach(() => {
    showSheet.mockReset().mockImplementation(() => undefined)
    alert.mockReset().mockImplementation(() => undefined)
  })

  it.each([
    ['End session', 1, 0],
    ['Cancel session', 0, 1],
    ['Close', 0, 0],
  ])('does what %s says with no follow-up pop-up', (label, ended, canceled) => {
    const onEnd = jest.fn()
    const onCancel = jest.fn()

    openSessionMenu({ onEnd, onCancel })
    pickFromSheet(label)

    expect(onEnd).toHaveBeenCalledTimes(ended)
    expect(onCancel).toHaveBeenCalledTimes(canceled)
    expect(alert).not.toHaveBeenCalled()
  })
})
