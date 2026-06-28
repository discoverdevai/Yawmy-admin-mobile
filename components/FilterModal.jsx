import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Reset from '../assets/icons/reset.svg';
import Clock from '../assets/icons/clock.svg';
import StatusActive from '../assets/icons/status-active.svg';
import StatusExpired from '../assets/icons/status-expired.svg';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

// Status chips are fixed for the enrollment domain (Figma 598-112126 / 598-112224).
const STATUS_OPTIONS = [
  {
    key: 'pending',
    label: 'Pending',
    Icon: Clock,
    bg: '#F2F2F2',
    border: Colors.gray,
    text: Colors.gray,
  },
  {
    key: 'active',
    label: 'Active',
    Icon: StatusActive,
    bg: Colors.lightGreen,
    border: '#367300',
    text: Colors.primaryText,
  },
  {
    key: 'expired',
    label: 'Invitation Expired',
    Icon: StatusExpired,
    bg: Colors.lightRedBg,
    border: Colors.redText,
    text: Colors.redText,
  },
];

/**
 * Bottom-sheet filter for the enrollment lists (Figma 598-112126).
 * Filter by status and by role; the Apply button shows the selected count.
 * `roles` is the list of role chips (derived from the data, so it works for
 * Staff / Parents / Children). `initial` pre-selects from the active filter.
 */
export default function FilterModal({
  visible,
  roles = [],
  initial = { statuses: [], roles: [] },
  onClose,
  onApply,
}) {
  const [statuses, setStatuses] = useState([]);
  const [selRoles, setSelRoles] = useState([]);

  useEffect(() => {
    if (visible) {
      setStatuses(initial.statuses || []);
      setSelRoles(initial.roles || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const toggle = (list, setList, value) =>
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);

  const count = statuses.length + selRoles.length;

  const resetAll = () => {
    setStatuses([]);
    setSelRoles([]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.content}>
              {/* Header */}
              <View style={styles.head}>
                <Text style={styles.title}>Filter</Text>
                <Pressable style={styles.reset} onPress={resetAll} hitSlop={8}>
                  <Reset width={16} height={16} />
                  <Text style={styles.resetText}>Reset all</Text>
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* By status */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>By Status</Text>
                  <View style={styles.chipRow}>
                    {STATUS_OPTIONS.map((s) => {
                      const on = statuses.includes(s.key);
                      const Icon = s.Icon;
                      return (
                        <Pressable
                          key={s.key}
                          onPress={() => toggle(statuses, setStatuses, s.key)}
                          style={[
                            styles.chip,
                            { backgroundColor: s.bg },
                            on && { borderWidth: 1, borderColor: s.border },
                          ]}
                        >
                          <Icon width={16} height={16} />
                          <Text style={[styles.chipText, { color: s.text }]}>{s.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* By role */}
                <View style={[styles.section, styles.sectionLast]}>
                  <Text style={styles.sectionLabel}>By Role</Text>
                  <View style={styles.chipRow}>
                    {roles.map((role) => {
                      const on = selRoles.includes(role);
                      return (
                        <Pressable
                          key={role}
                          onPress={() => toggle(selRoles, setSelRoles, role)}
                          style={[styles.roleChip, on && styles.roleChipOn]}
                        >
                          <Text style={[styles.roleText, on && styles.roleTextOn]}>{role}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>

              <Pressable
                style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
                onPress={() => onApply({ statuses, roles: selRoles })}
              >
                <Text style={styles.ctaText}>
                  Apply Filter{count > 0 ? ` (${count})` : ''}
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.7)' },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radii.button,
    borderTopRightRadius: Radii.button,
    maxHeight: '80%',
  },
  content: { padding: Spacing.md, gap: Spacing.lg },

  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 36,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },
  title: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },
  reset: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  resetText: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 16, color: Colors.accent },

  section: {
    gap: Spacing.md,
    paddingBottom: Spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
    marginBottom: Spacing.md,
  },
  sectionLast: { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 },
  sectionLabel: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.gray },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: 40,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.button,
  },
  chipText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14 },

  roleChip: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.button,
    backgroundColor: '#F2F2F2',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  roleChipOn: { backgroundColor: Colors.primaryBgLight, borderColor: Colors.primary },
  roleText: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 14, color: Colors.gray },
  roleTextOn: { color: Colors.primaryText },

  cta: {
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  ctaText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.background },
});
