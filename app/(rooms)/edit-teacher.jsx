import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import EditIcon from '../../assets/icons/edit-dark.svg';
import ChevronDown from '../../assets/icons/chevron-down.svg';
import Check from '../../assets/icons/check.svg';
import CheckWhite from '../../assets/icons/check-white.svg';
import { useRooms } from '../../context/RoomsContext';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const ROLES = ['Lead Teacher', 'Assistant Teacher', 'Co-Teacher', 'Substitute Teacher'];

const defaultEmail = (n) => `${n.trim().toLowerCase().replace(/\s+/g, '.')}@gmail.com`;

export default function EditTeacher() {
  const router = useRouter();
  const { teacherName, roomId } = useLocalSearchParams();
  const { rooms, teacherInfo, updateTeacherInfo, setTeacherRooms } = useRooms();

  const origName = String(teacherName || '');
  const originalRoomId = Number(roomId);
  const info = teacherInfo[origName] || {};

  const [name, setName] = useState(info.name ?? origName);
  const [email] = useState(info.email ?? defaultEmail(origName)); // read-only
  const [role, setRole] = useState(info.role ?? 'Lead Teacher');
  const [selectedRoomId, setSelectedRoomId] = useState(originalRoomId);
  const [removeAll, setRemoveAll] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/rooms');
  };

  const handleSave = () => {
    updateTeacherInfo(origName, { name: name.trim() || origName, email: email.trim(), role });
    if (removeAll) {
      setTeacherRooms(origName, []); // out of every room; account stays, can be reassigned later
    } else {
      // Replace this room's assignment: leave the room opened from, join the chosen one.
      const current = rooms.filter((r) => (r.teachers || []).includes(origName)).map((r) => r.id);
      const next = current.filter((id) => id !== originalRoomId);
      if (!next.includes(selectedRoomId)) next.push(selectedRoomId);
      setTeacherRooms(origName, next);
    }
    goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Teacher Info</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Teacher Name</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Teacher name"
              placeholderTextColor={Colors.gray}
            />
            <EditIcon width={24} height={24} />
          </View>
        </View>

        {/* Email — read-only */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputBox}>
            <Text style={styles.value}>{email}</Text>
          </View>
        </View>

        {/* Role */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Role</Text>
          <Pressable
            style={[styles.inputBox, roleOpen && styles.inputBoxOpen]}
            onPress={() => {
              setRoleOpen((o) => !o);
              setRoomOpen(false);
            }}
          >
            <Text style={styles.value}>{role}</Text>
            <ChevronDown width={24} height={24} style={roleOpen ? styles.chevronUp : undefined} />
          </Pressable>
          {roleOpen && (
            <View style={styles.dropdownPanel}>
              {ROLES.map((r) => (
                <Pressable
                  key={r}
                  style={styles.optionRow}
                  onPress={() => {
                    setRole(r);
                    setRoleOpen(false);
                  }}
                >
                  <Text style={styles.optionName}>{r}</Text>
                  {role === r && <Check width={16} height={16} />}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Assigned room */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Assigned Room</Text>
          <Pressable
            style={[
              styles.inputBox,
              roomOpen && styles.inputBoxOpen,
              removeAll && styles.inputBoxDisabled,
            ]}
            disabled={removeAll}
            onPress={() => {
              setRoomOpen((o) => !o);
              setRoleOpen(false);
            }}
          >
            <Text style={styles.value}>{selectedRoom?.name || '—'}</Text>
            <ChevronDown width={24} height={24} style={roomOpen ? styles.chevronUp : undefined} />
          </Pressable>
          {roomOpen && !removeAll && (
            <View style={styles.dropdownPanel}>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {rooms.map((r) => (
                  <Pressable
                    key={r.id}
                    style={styles.optionRow}
                    onPress={() => {
                      setSelectedRoomId(r.id);
                      setRoomOpen(false);
                    }}
                  >
                    <Text style={styles.optionName}>{r.name}</Text>
                    {r.id === selectedRoomId && <Check width={16} height={16} />}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Remove from all rooms */}
        <Pressable
          style={styles.removeRow}
          onPress={() =>
            setRemoveAll((v) => {
              if (!v) setRoomOpen(false); // closing the room dropdown when disabling it
              return !v;
            })
          }
        >
          <View style={[styles.checkbox, removeAll && styles.checkboxOn]}>
            {removeAll && <CheckWhite width={16} height={16} />}
          </View>
          <Text style={styles.removeText}>Remove from all assigned rooms?</Text>
        </Pressable>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable style={styles.cancelBtn} onPress={goBack}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
          onPress={handleSave}
        >
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },

  content: { padding: Spacing.md, gap: Spacing.md },
  fieldGroup: { gap: Spacing.sm + 4 },
  label: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 16, color: Colors.textBlack },
  inputBox: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.sm + 4,
  },
  inputBoxOpen: { backgroundColor: Colors.tapsBg, borderColor: Colors.primary },
  inputBoxDisabled: { opacity: 0.5 },
  input: { flex: 1, padding: 0, fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },
  value: { flex: 1, fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },
  chevronUp: { transform: [{ rotate: '180deg' }] },
  dropdownPanel: {
    maxHeight: 180,
    backgroundColor: Colors.tapsBg,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radii.button,
    padding: Spacing.sm + 4,
    overflow: 'hidden',
  },
  optionRow: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionName: {
    flexShrink: 1,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    color: Colors.textBlack,
  },
  removeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.stroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  removeText: {
    fontFamily: Fonts.bold,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.textBlack,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  cancelBtn: { flex: 1, height: 48, borderRadius: Radii.button, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.gray },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  saveText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.white },
});
