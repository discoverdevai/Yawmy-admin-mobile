import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChevronDown from '../assets/icons/chevron-down.svg';
import Check from '../assets/icons/check.svg';
import ErrorModal from './ErrorModal';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import {
  getTeachers,
  getRoomTeachers,
  assignTeacher,
  unassignTeacher,
  updateRoom,
} from '../services/roomsService';
import { getChildren, reassignChildRoom } from '../services/childrenService';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

// Items in `a` that are not in `b`.
const diff = (a, b) => a.filter((x) => !b.includes(x));

export default function EditRoomModal({ visible, onClose, room, onSaved }) {
  const [name, setName] = useState('');
  const capacity = room?.capacity ?? 0;

  const [teacherList, setTeacherList] = useState([]); // [{ id, fullName }]
  const [childList, setChildList] = useState([]); // [{ id, fullName, roomId, roomName }]

  const [teachers, setTeachers] = useState([]); // selected teacher ids
  const [childIds, setChildIds] = useState([]); // selected child ids

  const initialTeachers = useRef([]);
  const initialChildIds = useRef([]);

  const [teacherOpen, setTeacherOpen] = useState(false);
  const [childOpen, setChildOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const keyboardHeight = useKeyboardHeight();
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(shift, {
      toValue: -keyboardHeight,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [keyboardHeight, shift]);

  // Fetch the room's teachers + children (and the full pick-lists) on open.
  useEffect(() => {
    if (!visible || !room?.id) return;
    let alive = true;
    setLoading(true);
    setName(room.name || '');
    setTeacherOpen(false);
    setChildOpen(false);

    Promise.all([
      getTeachers().catch(() => []),
      getRoomTeachers(room.id).catch(() => []),
      getChildren({ includeUnenrolled: false }).catch(() => []),
      getChildren({ roomId: room.id }).catch(() => []),
    ])
      .then(([allTeachers, roomTeachers, allChildren, roomChildren]) => {
        if (!alive) return;
        setTeacherList(
          (allTeachers || []).map((t) => ({ id: t.id, fullName: t.fullName }))
        );
        setChildList(
          (allChildren || []).map((c) => ({
            id: c.id,
            fullName: c.fullName,
            roomId: c.roomId,
            roomName: c.roomName,
          }))
        );
        const assignedTeacherIds = (roomTeachers || []).map((t) => t.teacherId);
        const assignedChildIds = (roomChildren || []).map((c) => c.id);
        setTeachers(assignedTeacherIds);
        setChildIds(assignedChildIds);
        initialTeachers.current = assignedTeacherIds;
        initialChildIds.current = assignedChildIds;
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [visible, room?.id]);

  const canSubmit = name.trim().length > 0 && !loading;
  const remaining = capacity - childIds.length;

  const toggleTeacher = (id) =>
    setTeachers((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const toggleChild = (id) =>
    setChildIds((l) => {
      if (l.includes(id)) return l.filter((x) => x !== id);
      // Adding — respect the room's capacity.
      if (l.length >= capacity) {
        setNotice({
          title: 'Room is full',
          message: `This room can hold ${capacity} children. Remove a child before adding another.`,
        });
        return l;
      }
      return [...l, id];
    });

  const handleSave = async () => {
    if (!canSubmit || !room || saving) return;
    setSaving(true);
    try {
      // 1. Room name (only when it actually changed).
      if (name.trim() !== (room.name || '')) {
        await updateRoom(room.id, { name: name.trim() });
      }

      // 2. Teachers — assign the newly added, unassign the removed.
      const addTeachers = diff(teachers, initialTeachers.current);
      const removeTeachers = diff(initialTeachers.current, teachers);
      for (const id of addTeachers) await assignTeacher(room.id, id);
      for (const id of removeTeachers) await unassignTeacher(room.id, id);

      // 3. Children — move the added into this room, the removed out of it.
      const addChildren = diff(childIds, initialChildIds.current);
      const removeChildren = diff(initialChildIds.current, childIds);
      for (const id of addChildren) await reassignChildRoom(id, room.id);
      for (const id of removeChildren) await reassignChildRoom(id, null);

      onSaved?.();
      onClose();
    } catch (e) {
      setNotice({
        title: 'Could not save',
        message: e.message || 'Something went wrong while saving the room.',
      });
    } finally {
      setSaving(false);
    }
  };

  const teacherSummary = teachers.length
    ? teacherList
        .filter((t) => teachers.includes(t.id))
        .map((t) => t.fullName)
        .join(', ')
    : 'Select teacher(s)';
  const atCapacity = childIds.length >= capacity;
  const childSummary = childIds.length
    ? `${childIds.length} of ${capacity} selected`
    : 'Select children';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View style={[styles.sheet, { transform: [{ translateY: shift }] }]}>
          <SafeAreaView edges={['bottom']}>
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.title}>Edit Room</Text>

              {loading ? (
                <ActivityIndicator style={{ marginVertical: Spacing.xl }} color={Colors.primary} />
              ) : (
                <>
                  {/* Room name */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Room Name</Text>
                    <View style={styles.inputBox}>
                      <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Enter room name"
                        placeholderTextColor={Colors.gray}
                      />
                    </View>
                  </View>

                  {/* Teachers */}
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Assign Teacher(s)</Text>
                    <Pressable
                      style={[styles.inputBox, teacherOpen && styles.inputBoxOpen]}
                      onPress={() => setTeacherOpen((o) => !o)}
                    >
                      <View style={styles.dropdownRow}>
                        <Text
                          style={[styles.placeholder, teachers.length > 0 && styles.filled]}
                          numberOfLines={1}
                        >
                          {teacherSummary}
                        </Text>
                        <ChevronDown width={24} height={24} style={teacherOpen ? styles.chevronUp : undefined} />
                      </View>
                    </Pressable>
                    {teacherOpen && (
                      <View style={styles.dropdownPanel}>
                        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                          {teacherList.length === 0 ? (
                            <Text style={styles.emptyOption}>No teachers available yet.</Text>
                          ) : (
                            teacherList.map((t) => {
                              const selected = teachers.includes(t.id);
                              return (
                                <Pressable key={t.id} style={styles.optionRow} onPress={() => toggleTeacher(t.id)}>
                                  <Text style={styles.optionName}>{t.fullName}</Text>
                                  <View style={[styles.checkbox, selected && styles.checkboxOn]}>
                                    {selected && <Check width={16} height={16} />}
                                  </View>
                                </Pressable>
                              );
                            })
                          )}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Children */}
                  <View style={styles.fieldGroup}>
                    <View style={styles.labelRow}>
                      <Text style={styles.label}>Assign Children</Text>
                      <Text style={[styles.slots, atCapacity && styles.slotsFull]}>
                        {atCapacity ? 'Room full' : `${remaining} slot${remaining === 1 ? '' : 's'} left`}
                      </Text>
                    </View>
                    <Pressable
                      style={[styles.inputBox, childOpen && styles.inputBoxOpen]}
                      onPress={() => setChildOpen((o) => !o)}
                    >
                      <View style={styles.dropdownRow}>
                        <Text
                          style={[styles.placeholder, childIds.length > 0 && styles.filled]}
                          numberOfLines={1}
                        >
                          {childSummary}
                        </Text>
                        <ChevronDown width={24} height={24} style={childOpen ? styles.chevronUp : undefined} />
                      </View>
                    </Pressable>
                    {childOpen && (
                      <View style={styles.dropdownPanel}>
                        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                          {childList.length === 0 ? (
                            <Text style={styles.emptyOption}>No children enrolled yet.</Text>
                          ) : (
                            childList.map((c) => {
                              const selected = childIds.includes(c.id);
                              // Once the room is full, unselected children can't be added.
                              const blocked = !selected && atCapacity;
                              // Flag children who sit in a different room today —
                              // checking them will move them here.
                              const elsewhere =
                                c.roomId && c.roomId !== room?.id ? c.roomName : null;
                              return (
                                <Pressable
                                  key={c.id}
                                  style={[styles.optionRow, blocked && styles.optionRowDisabled]}
                                  onPress={() => toggleChild(c.id)}
                                  disabled={blocked}
                                >
                                  <Text style={styles.optionName} numberOfLines={1}>
                                    {c.fullName}
                                    {elsewhere ? <Text style={styles.optionHint}>{`  · in ${elsewhere}`}</Text> : null}
                                  </Text>
                                  <View style={[styles.checkbox, selected && styles.checkboxOn]}>
                                    {selected && <Check width={16} height={16} />}
                                  </View>
                                </Pressable>
                              );
                            })
                          )}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.saveBtn,
                      (!canSubmit || saving) && styles.saveBtnDisabled,
                      pressed && canSubmit && !saving && styles.pressed,
                    ]}
                    onPress={handleSave}
                    disabled={!canSubmit || saving}
                  >
                    <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>

      <ErrorModal
        visible={!!notice}
        title={notice?.title}
        message={notice?.message}
        buttonText="OK"
        onClose={() => setNotice(null)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radii.button,
    borderTopRightRadius: Radii.button,
    maxHeight: '90%',
  },
  content: { padding: Spacing.md, gap: Spacing.md },
  title: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 20,
    color: Colors.textBlack,
  },
  fieldGroup: { gap: Spacing.sm + 4 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 16,
    color: Colors.textBlack,
  },
  slots: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 12,
    color: Colors.gray,
  },
  slotsFull: { color: Colors.error || '#D14343' },
  inputBox: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.sm + 4,
    justifyContent: 'center',
  },
  inputBoxOpen: {
    backgroundColor: Colors.tapsBg,
    borderColor: Colors.primary,
  },
  input: {
    padding: 0,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textBlack,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  placeholder: {
    flexShrink: 1,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.gray,
  },
  filled: { color: Colors.textBlack },
  chevronUp: { transform: [{ rotate: '180deg' }] },
  dropdownPanel: {
    height: 138,
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
  optionRowDisabled: { opacity: 0.4 },
  optionName: {
    flexShrink: 1,
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    color: Colors.textBlack,
  },
  optionHint: {
    fontFamily: Fonts.regular,
    fontWeight: '400',
    fontSize: 12,
    color: Colors.gray,
  },
  emptyOption: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.gray,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.stroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { borderColor: Colors.primary },
  saveBtn: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  saveBtnDisabled: { backgroundColor: Colors.disabledButton },
  pressed: { opacity: 0.85 },
  saveBtnText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.white,
  },
});
