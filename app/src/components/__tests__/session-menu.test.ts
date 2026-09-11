import { ActionSheetIOS, Alert, type AlertButton } from 'react-native'
import { openEndMenu, openSessionMenu } from '../session-menu'

const showSheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
const alert = jest.spyOn(Alert, 'alert')

const pickFromSheet = (label: string) => {
  const [[{ options }, onPick]] = showSheet.mock.calls
  onPick(options.indexOf(label))
}

const pressInAlert = (label: string) => {
  const buttons = alert.mock.calls[0]?.[2] as AlertButton[]
  buttons.find((button) => button.text === label)?.onPress?.()
}

describe('openEndMenu', () => {
  beforeEach(() => alert.mockReset().mockImplementation(() => undefined))

  it.each([
    ['End session', 1, 0],
    ['Cancel session', 0, 1],
    ['Keep going', 0, 0],
  ])('does what %s says and nothing else', (label, ended, canceled) => {
    const onEnd = jest.fn()
    const onCancel = jest.fn()

    openEndMenu({ onEnd, onCancel })
    pressInAlert(label)

    expect(onEnd).toHaveBeenCalledTimes(ended)
    expect(onCancel).toHaveBeenCalledTimes(canceled)
  })
})

describe('openSessionMenu', () => {
  beforeEach(() => {
    showSheet.mockReset().mockImplementation(() => undefined)
    alert.mockReset().mockImplementation(() => undefined)
  })

  it('cancels only after the cancel is confirmed', () => {
    const onCancel = jest.fn()

    openSessionMenu(onCancel)
    pickFromSheet('Cancel session')
    expect(onCancel).not.toHaveBeenCalled()
    pressInAlert('Cancel session')

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('keeps the session when the confirm is dismissed', () => {
    const onCancel = jest.fn()

    openSessionMenu(onCancel)
    pickFromSheet('Cancel session')
    pressInAlert('Keep going')

    expect(onCancel).not.toHaveBeenCalled()
  })

  it('asks for nothing when the menu is closed', () => {
    const onCancel = jest.fn()

    openSessionMenu(onCancel)
    pickFromSheet('Close')

    expect(alert).not.toHaveBeenCalled()
    expect(onCancel).not.toHaveBeenCalled()
  })
})
