import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import EditIcon from '../../assets/icons/edit-dark.svg';
import ChevronDown from '../../assets/icons/chevron-down.svg';
import Check from '../../assets/icons/check.svg';
import CheckWhite from '../../assets/icons/check-white.svg';
import RoomArchivedModal from '../../components/RoomArchivedModal';
import ErrorModal from '../../components/ErrorModal';
import { getStaffMember, updateStaffMember, getStaffRoles } from '../../services/staffService';
import {
  getRooms,
  getTeacherRooms,
  assignTeacher,
  unassignTeacher,
} from '../../services/roomsService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

export default function EditTeacher() {
  const router = useRouter();
  const { teacherId, title } = useLocalSearchParams();
  const headerTitle = title || 'Edit Teacher Info';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(null); // staffRole enum value
  const [roles, setRoles] = useState([]); // [{ value, label }]
  const [allRooms, setAllRooms] = useState([]); // [{ id, name }]
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [removeAll, setRemoveAll] = useState(false);

  const [roleOpen, setRoleOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);

  const orig = useRef({ name: '', email: '', role: null, roomIds: [] });

  const load = useCallback(async () => {
    if (!teacherId) return;
    setLoading(true);
    try {
      const [teacher, roleOpts, rooms, tRooms] = await Promise.all([
        getStaffMember(teacherId),
        getStaffRoles(),
        getRooms(false),
        getTeacherRooms(teacherId).catch(() => []),
      ]);
      setName(teacher.fullName || '');
      setEmail(teacher.email || '');
      setRole(teacher.staffRole || null);
      setRoles(Array.isArray(roleOpts) ? roleOpts : []);
      setAllRooms((rooms || []).map((r) => ({ id: r.id, name: r.name })));
      const ids = (tRooms || []).map((r) => r.roomId);
      setSelectedRoomIds(ids);
      orig.current = {
        name: teacher.fullName || '',
        email: teacher.email || '',
        role: teacher.staffRole || null,
        roomIds: ids,
      };
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load the teacher.');
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    load();
  }, [load]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/rooms');
  };

  const roleLabel = roles.find((r) => r.value === role)?.label || 'Select role';
  const roomSummary = selectedRoomIds.length
    ? allRooms
        .filter((r) => selectedRoomIds.includes(r.id))
        .map((r) => r.name)
        .join(', ')
    : 'Select room(s)';

  const toggleRoom = (id) =>
    setSelectedRoomIds((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // 1. Teacher's own fields.
      const patch = {};
      if (name.trim() && name.trim() !== orig.current.name) patch.fullName = name.trim();
      if (email.trim() && email.trim() !== orig.current.email) patch.email = email.trim();
      if (role && role !== orig.current.role) patch.staffRole = role;
      if (Object.keys(patch).length) await updateStaffMember(teacherId, patch);

      // 2. Room assignments.
      const original = orig.current.roomIds;
      if (removeAll) {
        // Checkbox wins — remove from every currently-assigned room.
        for (const id of original) await unassignTeacher(id, teacherId);
      } else {
        const sel = new Set(selectedRoomIds);
        const origSet = new Set(original);
        for (const id of selectedRoomIds) if (!origSet.has(id)) await assignTeacher(id, teacherId);
        for (const id of original) if (!sel.has(id)) await unassignTeacher(id, teacherId);
      }

      setShowSuccess(true);
    } catch (e) {
      setError(e.message || 'Could not save the teacher.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft width={24} height={24} />
          </Pressable>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
        </View>
        <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
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

        {/* Email */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={Colors.gray}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Role — single select from backend options */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Role</Text>
          <Pressable
            style={[styles.inputBox, roleOpen && styles.inputBoxOpen]}
            onPress={() => {
              setRoleOpen((o) => !o);
              setRoomOpen(false);
            }}
          >
            <Text style={[styles.value, !role && styles.placeholder]}>{roleLabel}</Text>
            <ChevronDown width={24} height={24} style={roleOpen ? styles.chevronUp : undefined} />
          </Pressable>
          {roleOpen && (
            <View style={styles.dropdownPanel}>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {roles.map((r) => (
                  <Pressable
                    key={r.value}
                    style={styles.optionRow}
                    onPress={() => {
                      setRole(r.value);
                      setRoleOpen(false);
                    }}
                  >
                    <Text style={styles.optionName}>{r.label}</Text>
                    {role === r.value && <Check width={16} height={16} />}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Assigned rooms — multi select (disabled when "remove from all") */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Assigned Rooms</Text>
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
            <Text style={[styles.value, selectedRoomIds.length === 0 && styles.placeholder]} numberOfLines={1}>
              {removeAll ? '—' : roomSummary}
            </Text>
            <ChevronDown width={24} height={24} style={roomOpen ? styles.chevronUp : undefined} />
          </Pressable>
          {roomOpen && !removeAll && (
            <View style={styles.dropdownPanel}>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {allRooms.length === 0 ? (
                  <Text style={styles.emptyOption}>No rooms available.</Text>
                ) : (
                  allRooms.map((r) => {
                    const selected = selectedRoomIds.includes(r.id);
                    return (
                      <Pressable key={r.id} style={styles.optionRow} onPress={() => toggleRoom(r.id)}>
                        <Text style={styles.optionName}>{r.name}</Text>
                        <View style={[styles.checkbox, selected && styles.checkboxOn]}>
                          {selected && <CheckWhite width={16} height={16} />}
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Remove from all rooms — high priority over the room selection */}
        <Pressable
          style={styles.removeRow}
          onPress={() =>
            setRemoveAll((v) => {
              if (!v) setRoomOpen(false);
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
        <Pressable style={styles.cancelBtn} onPress={goBack} disabled={saving}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.saveBtn, (saving || pressed) && styles.pressed]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
        </Pressable>
      </View>

      <RoomArchivedModal
        visible={showSuccess}
        title="Teacher updated successfully!"
        onClose={() => {
          setShowSuccess(false);
          goBack();
        }}
      />

      <ErrorModal
        visible={!!error && !loading}
        title="Something went wrong"
        message={error}
        buttonText="OK"
        onClose={() => setError(null)}
      />
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
  placeholder: { color: Colors.gray },
  chevronUp: { transform: [{ rotate: '180deg' }] },
  dropdownPanel: {
    maxHeight: 200,
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
  emptyOption: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.gray,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
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
