import { Stack, router } from 'expo-router'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { Text } from '../src/components/themed'
import {
  TARGETS_BOUNDS,
  type ChatStyle,
  type Settings,
  type TargetsSetting,
} from '@contracts'
import { useSettings, useUpdateSettings } from '../src/api/use-settings'
import { Chip } from '../src/components/chip'
import { colors, spacing } from '../src/theme/tokens'

const COUNTS: [TargetsSetting, string][] = [
  ['chatTargets', 'Chat'],
  ['gapsTargets', 'Gaps'],
  ['describeTargets', 'Describe it'],
  ['smuggleTargets', 'Smuggle'],
]

const STYLES: [ChatStyle, string][] = [
  ['informal', 'informal'],
  ['formal', 'formal'],
]

type StepperProps = { label: string; value: number; min: number; max: number; onChange: (next: number) => void }

const Stepper = ({ label, value, min, max, onChange }: StepperProps) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.stepper}>
      <Pressable
        onPress={() => onChange(value - 1)}
        disabled={value <= min}
        accessibilityRole="button"
        accessibilityLabel={`One fewer ${label} phrase`}
        style={[styles.step, value <= min && styles.stepOff]}
      >
        <Text style={styles.stepIcon}>−</Text>
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable
        onPress={() => onChange(value + 1)}
        disabled={value >= max}
        accessibilityRole="button"
        accessibilityLabel={`One more ${label} phrase`}
        style={[styles.step, value >= max && styles.stepOff]}
      >
        <Text style={styles.stepIcon}>+</Text>
      </Pressable>
    </View>
  </View>
)

const Form = ({ settings }: { settings: Settings }) => {
  const update = useUpdateSettings()

  return (
    <View style={styles.form}>
      <Text style={styles.heading}>Phrases per session</Text>
      {COUNTS.map(([field, label]) => (
        <Stepper
          key={field}
          label={label}
          value={settings[field]}
          min={TARGETS_BOUNDS[field].min}
          max={TARGETS_BOUNDS[field].max}
          onChange={(next) => update.mutate({ ...settings, [field]: next })}
        />
      ))}
      <Text style={styles.heading}>Default chat style</Text>
      <View style={styles.styles}>
        {STYLES.map(([value, label]) => (
          <Chip
            key={value}
            label={label}
            active={settings.defaultStyle === value}
            onPress={() => update.mutate({ ...settings, defaultStyle: value })}
          />
        ))}
      </View>
      {update.isError ? <Text style={styles.error}>Could not save that — put back</Text> : null}
    </View>
  )
}

export default function SettingsScreen() {
  const settings = useSettings()

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Settings' }} />
      {settings.data ? <Form settings={settings.data} /> : null}
      {settings.isPending ? <ActivityIndicator style={styles.state} /> : null}
      {settings.isError ? <Text style={styles.error}>Could not load your settings</Text> : null}
      <Text style={styles.heading}>Chat scenarios</Text>
      <Pressable onPress={() => router.push('/scenarios')} accessibilityRole="button" style={styles.row}>
        <Text style={styles.label}>Saved scenarios</Text>
        <Text style={styles.link}>Manage</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
  form: { gap: spacing.sm },
  heading: { fontSize: 13, fontWeight: '600', color: colors.muted, paddingTop: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  label: { fontSize: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  step: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepOff: { opacity: 0.3 },
  stepIcon: { fontSize: 18, lineHeight: 20 },
  value: { fontSize: 16, fontWeight: '600', minWidth: 20, textAlign: 'center' },
  styles: { flexDirection: 'row', gap: spacing.sm },
  link: { color: colors.ok, fontSize: 15, fontWeight: '600' },
  state: { paddingVertical: spacing.lg },
  error: { color: colors.error, paddingVertical: spacing.sm },
})
