import { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import EditIcon from '../../assets/icons/edit-dark.svg';
import Calendar from '../../assets/icons/calendar.svg';
import ChevronDown from '../../assets/icons/chevron-down.svg';
import Check from '../../assets/icons/check.svg';
import Plus from '../../assets/icons/plus.svg';
import Trash from '../../assets/icons/trash.svg';
import Call from '../../assets/icons/call.svg';
import AddContactModal from '../../components/AddContactModal';
import DeleteContactModal from '../../components/DeleteContactModal';
import DatePickerModal from '../../components/DatePickerModal';
import { useRooms } from '../../context/RoomsContext';
import { CHILDREN } from '../../constants/people';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const SEED_CONTACTS = () => [
  { id: 1, label: 'Mother – Sara Ahmed', phone: '+20 100 123 4567' },
  { id: 2, label: 'Father – Mohamed Hassan', phone: '+20 100 123 4567' },
];

function ContactsCard({ title, contacts, onRequestEdit, onRequestDelete, onRequestAdd }) {
  return (
    <View style={styles.contactsCard}>
      <View style={styles.contactsHead}>
        <Text style={styles.contactsTitle}>{title}</Text>
        <Pressable style={styles.addContactBtn} onPress={onRequestAdd}>
          <Plus width={20} height={20} />
        </Pressable>
      </View>
      {contacts.map((c) => (
        <View key={c.id} style={styles.contactRow}>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName}>{c.label}</Text>
            <View style={styles.phoneRow}>
              <Call width={16} height={16} />
              <Text style={styles.phoneText}>{c.phone}</Text>
            </View>
          </View>
          <View style={styles.contactActions}>
            <Pressable hitSlop={6} onPress={() => onRequestEdit(c)}>
              <EditIcon width={24} height={24} />
            </Pressable>
            <Pressable hitSlop={6} onPress={() => onRequestDelete(c.id)}>
              <Trash width={24} height={24} />
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function EditChild() {
  const router = useRouter();
  const { childId, roomId } = useLocalSearchParams();
  const { rooms, childInfo, updateChildInfo, toggleChild } = useRooms();

  const cid = Number(childId);
  const originalRoomId = Number(roomId);
  const child = CHILDREN.find((c) => c.id === cid);
  const override = childInfo[cid] || {};

  const [name, setName] = useState(override.name ?? child?.name ?? '');
  const [dob, setDob] = useState(override.dob ?? '15 Aug 2020');
  const [selectedRoomId, setSelectedRoomId] = useState(originalRoomId);
  const [roomOpen, setRoomOpen] = useState(false);
  const [showDate, setShowDate] = useState(false);
  // Contacts are edited locally and only committed to the child on Save.
  const [emergency, setEmergency] = useState(() => override.emergency ?? SEED_CONTACTS());
  const [pickup, setPickup] = useState(() => override.pickup ?? SEED_CONTACTS());
  const [addFor, setAddFor] = useState(null); // 'emergency' | 'pickup' | null
  const [editTarget, setEditTarget] = useState(null); // { section, contact }
  const [deleteTarget, setDeleteTarget] = useState(null); // { section, id }
  const nextContactId = useRef(null);
  if (nextContactId.current === null) {
    const ids = [...emergency, ...pickup].map((c) => c.id);
    nextContactId.current = (ids.length ? Math.max(...ids) : 99) + 1;
  }

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  const addContact = (contact) => {
    const entry = { id: nextContactId.current++, ...contact };
    if (addFor === 'emergency') setEmergency((l) => [...l, entry]);
    else if (addFor === 'pickup') setPickup((l) => [...l, entry]);
  };

  const saveContact = (built) => {
    if (editTarget) {
      const setter = editTarget.section === 'emergency' ? setEmergency : setPickup;
      setter((l) => l.map((c) => (c.id === editTarget.contact.id ? { ...c, ...built } : c)));
    } else {
      addContact(built);
    }
  };

  const closeContactModal = () => {
    setAddFor(null);
    setEditTarget(null);
  };

  const contactSection = editTarget?.section || addFor;
  const contactModalTitle = editTarget
    ? contactSection === 'pickup'
      ? 'Edit Pickup Contacts'
      : 'Edit Emergency Contacts'
    : contactSection === 'pickup'
      ? 'Add Pickup Contacts'
      : 'Add Emergency Contacts';

  const confirmDeleteContact = () => {
    if (deleteTarget?.section === 'emergency') {
      setEmergency((l) => l.filter((c) => c.id !== deleteTarget.id));
    } else if (deleteTarget?.section === 'pickup') {
      setPickup((l) => l.filter((c) => c.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/rooms');
  };

  const handleSave = () => {
    // Commit every edit at once — nothing is persisted until this point.
    updateChildInfo(cid, { name: name.trim() || child?.name, dob, emergency, pickup });
    // Changing the room moves the child there (and out of the old room).
    if (selectedRoomId !== originalRoomId) toggleChild(selectedRoomId, cid);
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
        <Text style={styles.headerTitle}>Edit Child Info</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Child name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Child Name</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Child name"
              placeholderTextColor={Colors.gray}
            />
            <EditIcon width={24} height={24} />
          </View>
        </View>

        {/* Date of birth — opens the calendar on the current date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Date of Birth</Text>
          <Pressable style={styles.inputBox} onPress={() => setShowDate(true)}>
            <Text style={styles.value}>{dob || 'Date of birth'}</Text>
            <Calendar width={24} height={24} />
          </Pressable>
        </View>

        {/* Room */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Room</Text>
          <Pressable
            style={[styles.inputBox, roomOpen && styles.inputBoxOpen]}
            onPress={() => setRoomOpen((o) => !o)}
          >
            <Text style={styles.value}>{selectedRoom?.name || '—'}</Text>
            <ChevronDown width={24} height={24} style={roomOpen ? styles.chevronUp : undefined} />
          </Pressable>
          {roomOpen && (
            <View style={styles.dropdownPanel}>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {rooms.map((r) => {
                  const sel = r.id === selectedRoomId;
                  return (
                    <Pressable
                      key={r.id}
                      style={styles.optionRow}
                      onPress={() => {
                        setSelectedRoomId(r.id);
                        setRoomOpen(false);
                      }}
                    >
                      <Text style={styles.optionName}>{r.name}</Text>
                      {sel && <Check width={16} height={16} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        <ContactsCard
          title="Emergency Contacts"
          contacts={emergency}
          onRequestEdit={(c) => setEditTarget({ section: 'emergency', contact: c })}
          onRequestDelete={(id) => setDeleteTarget({ section: 'emergency', id })}
          onRequestAdd={() => setAddFor('emergency')}
        />
        <ContactsCard
          title="Authorized Pickup Contacts"
          contacts={pickup}
          onRequestEdit={(c) => setEditTarget({ section: 'pickup', contact: c })}
          onRequestDelete={(id) => setDeleteTarget({ section: 'pickup', id })}
          onRequestAdd={() => setAddFor('pickup')}
        />
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

      <AddContactModal
        visible={!!addFor || !!editTarget}
        title={contactModalTitle}
        contact={editTarget?.contact}
        nameFirst
        relationFree
        nameLabel="Name"
        namePlaceholder="Enter name"
        onClose={closeContactModal}
        onSave={saveContact}
      />

      <DeleteContactModal
        visible={!!deleteTarget}
        message={`Are you sure you want to delete this ${
          deleteTarget?.section === 'pickup' ? 'pickup' : 'emergency'
        } contact? This action cannot be undone.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteContact}
      />

      <DatePickerModal
        visible={showDate}
        value={dob}
        format="DD MMM YYYY"
        onClose={() => setShowDate(false)}
        onSelect={setDob}
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
  headerTitle: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 20,
    color: Colors.textBlack,
  },

  content: { padding: Spacing.md, gap: Spacing.lg },
  fieldGroup: { gap: Spacing.sm + 4 },
  label: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 16,
    color: Colors.textBlack,
  },
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
  input: { flex: 1, padding: 0, fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },
  value: { flex: 1, fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },
  inputBoxOpen: { backgroundColor: Colors.tapsBg, borderColor: Colors.primary },
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

  // Contacts
  contactsCard: {
    backgroundColor: Colors.secBg,
    borderRadius: Radii.button,
    padding: Spacing.sm + 4,
    gap: Spacing.sm + 4,
  },
  contactsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactsTitle: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 12,
    color: Colors.gray,
  },
  addContactBtn: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primaryBg,
    borderRadius: 8,
    padding: Spacing.sm,
  },
  contactInfo: { flex: 1, gap: Spacing.sm },
  contactName: {
    fontFamily: Fonts.bold,
    fontWeight: '600',
    fontSize: 14,
    color: Colors.textBlack,
  },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  phoneText: {
    fontFamily: Fonts.medium,
    fontWeight: '500',
    fontSize: 14,
    color: Colors.textBlack,
  },
  contactActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.gray,
  },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  saveText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.white,
  },
});
