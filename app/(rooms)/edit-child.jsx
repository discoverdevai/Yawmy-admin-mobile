import { useRef, useState, useEffect, useCallback } from 'react';
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
import Calendar from '../../assets/icons/calendar.svg';
import ChevronDown from '../../assets/icons/chevron-down.svg';
import Check from '../../assets/icons/check.svg';
import Plus from '../../assets/icons/plus.svg';
import Trash from '../../assets/icons/trash.svg';
import Call from '../../assets/icons/call.svg';
import AddContactModal from '../../components/AddContactModal';
import DeleteContactModal from '../../components/DeleteContactModal';
import DatePickerModal from '../../components/DatePickerModal';
import ErrorModal from '../../components/ErrorModal';
import {
  getChild,
  updateChild,
  reassignChildRoom,
  getEmergencyContacts,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  getPickups,
  createPickup,
  updatePickup,
  deletePickup,
} from '../../services/childrenService';
import { getRooms } from '../../services/roomsService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');

// "2020-08-15" → "15 Aug 2020"
const dobToDisplay = (iso) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('-');
  return `${pad(Number(d))} ${MONTHS[Number(m) - 1] || ''} ${y}`;
};
// "15 Aug 2020" → "2020-08-15"
const dobToApi = (display) => {
  const m = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec((display || '').trim());
  if (!m) return null;
  const month = MONTHS.indexOf(m[2]);
  if (month < 0) return null;
  return `${m[3]}-${pad(month + 1)}-${pad(Number(m[1]))}`;
};

// The backend stores fullName + relationship separately; the UI shows one
// "Relation – Name" label. Convert between the two.
const toLabel = (relationship, fullName) => `${relationship || ''} – ${fullName || ''}`.trim();
const parseLabel = (label) => {
  const [rel, ...rest] = (label || '').split('–');
  return { relationship: (rel || '').trim(), fullName: rest.join('–').trim() };
};
const toBody = (c) => ({ ...parseLabel(c.label), phone: c.phone });

function ContactsCard({ title, contacts, onRequestEdit, onRequestDelete, onRequestAdd }) {
  return (
    <View style={styles.contactsCard}>
      <View style={styles.contactsHead}>
        <Text style={styles.contactsTitle}>{title}</Text>
        <Pressable style={styles.addContactBtn} onPress={onRequestAdd}>
          <Plus width={20} height={20} />
        </Pressable>
      </View>
      {contacts.length === 0 && <Text style={styles.contactsEmpty}>None added yet.</Text>}
      {contacts.map((c) => (
        <View key={c.key} style={styles.contactRow}>
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
            <Pressable hitSlop={6} onPress={() => onRequestDelete(c.key)}>
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
  const { childId } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [allRooms, setAllRooms] = useState([]); // [{ id, name }]
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [roomOpen, setRoomOpen] = useState(false);
  const [emergency, setEmergency] = useState([]);
  const [pickup, setPickup] = useState([]);

  const [showDate, setShowDate] = useState(false);
  const [addFor, setAddFor] = useState(null); // 'emergency' | 'pickup' | null
  const [editTarget, setEditTarget] = useState(null); // { section, contact }
  const [deleteTarget, setDeleteTarget] = useState(null); // { section, key }

  // Originals from the server, to diff against on Save.
  const origName = useRef('');
  const origDob = useRef('');
  const origRoomId = useRef(null);
  const origEmergency = useRef([]);
  const origPickup = useRef([]);
  const keyRef = useRef(1);
  const genKey = () => `n${keyRef.current++}`;

  const load = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    try {
      const [child, ec, pk, rooms] = await Promise.all([
        getChild(childId),
        getEmergencyContacts(childId).catch(() => []),
        getPickups(childId).catch(() => []),
        getRooms(false).catch(() => []),
      ]);
      const displayDob = dobToDisplay(child.dob);
      setName(child.fullName || '');
      setDob(displayDob);
      setAllRooms((rooms || []).map((r) => ({ id: r.id, name: r.name })));
      setSelectedRoomId(child.roomId || null);
      origName.current = child.fullName || '';
      origDob.current = displayDob;
      origRoomId.current = child.roomId || null;

      const mapC = (c) => ({
        key: String(c.id),
        id: c.id,
        label: toLabel(c.relationship, c.fullName),
        phone: c.phone,
      });
      const ecList = (ec || []).map(mapC);
      const pkList = (pk || []).map(mapC);
      setEmergency(ecList);
      setPickup(pkList);
      origEmergency.current = ecList;
      origPickup.current = pkList;
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load the child.');
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    load();
  }, [load]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/rooms');
  };

  // ── local contact editing ────────────────────────────────────────────────
  const saveContact = (built) => {
    if (editTarget) {
      const setter = editTarget.section === 'emergency' ? setEmergency : setPickup;
      setter((l) =>
        l.map((c) => (c.key === editTarget.contact.key ? { ...c, ...built } : c))
      );
    } else {
      const entry = { key: genKey(), id: null, label: built.label, phone: built.phone };
      if (addFor === 'emergency') setEmergency((l) => [...l, entry]);
      else if (addFor === 'pickup') setPickup((l) => [...l, entry]);
    }
  };

  const closeContactModal = () => {
    setAddFor(null);
    setEditTarget(null);
  };

  const confirmDeleteContact = () => {
    if (deleteTarget?.section === 'emergency') {
      setEmergency((l) => l.filter((c) => c.key !== deleteTarget.key));
    } else if (deleteTarget?.section === 'pickup') {
      setPickup((l) => l.filter((c) => c.key !== deleteTarget.key));
    }
    setDeleteTarget(null);
  };

  const contactSection = editTarget?.section || addFor;
  const contactModalTitle = editTarget
    ? contactSection === 'pickup'
      ? 'Edit Pickup Contacts'
      : 'Edit Emergency Contacts'
    : contactSection === 'pickup'
      ? 'Add Pickup Contacts'
      : 'Add Emergency Contacts';

  // ── Save: apply every staged change to the backend ───────────────────────
  const syncSection = async (current, original, api) => {
    const currentIds = new Set(current.filter((c) => c.id != null).map((c) => c.id));
    // Deletes: originals no longer present.
    for (const o of original) {
      if (!currentIds.has(o.id)) await api.remove(o.id);
    }
    // Creates + updates.
    for (const c of current) {
      if (c.id == null) {
        await api.create(toBody(c));
      } else {
        const o = original.find((x) => x.id === c.id);
        if (o && (o.label !== c.label || o.phone !== c.phone)) {
          await api.update(c.id, toBody(c));
        }
      }
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // 1. Child's own fields (name / dob).
      const patch = {};
      if (name.trim() && name.trim() !== origName.current) patch.fullName = name.trim();
      const apiDob = dobToApi(dob);
      if (apiDob && dob !== origDob.current) patch.dob = apiDob;
      if (Object.keys(patch).length) await updateChild(childId, patch);

      // 2. Room — reassign if it changed (backend enforces capacity).
      if (selectedRoomId !== origRoomId.current) {
        await reassignChildRoom(childId, selectedRoomId);
      }

      // 3. Emergency contacts + 4. pickups.
      await syncSection(emergency, origEmergency.current, {
        create: (b) => createEmergencyContact(childId, b),
        update: (id, b) => updateEmergencyContact(childId, id, b),
        remove: (id) => deleteEmergencyContact(childId, id),
      });
      await syncSection(pickup, origPickup.current, {
        create: (b) => createPickup(childId, b),
        update: (id, b) => updatePickup(childId, id, b),
        remove: (id) => deletePickup(childId, id),
      });

      goBack();
    } catch (e) {
      setError(e.message || 'Could not save the changes.');
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
          <Text style={styles.headerTitle}>Edit Child Info</Text>
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

        {/* Date of birth */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Date of Birth</Text>
          <Pressable style={styles.inputBox} onPress={() => setShowDate(true)}>
            <Text style={styles.value}>{dob || 'Date of birth'}</Text>
            <Calendar width={24} height={24} />
          </Pressable>
        </View>

        {/* Room — editable; changing it reassigns the child on Save */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Room</Text>
          <Pressable
            style={[styles.inputBox, roomOpen && styles.inputBoxOpen]}
            onPress={() => setRoomOpen((o) => !o)}
          >
            <Text style={[styles.value, !selectedRoomId && styles.valuePlaceholder]}>
              {allRooms.find((r) => r.id === selectedRoomId)?.name || 'Choose room'}
            </Text>
            <ChevronDown width={24} height={24} style={roomOpen ? styles.chevronUp : undefined} />
          </Pressable>
          {roomOpen && (
            <View style={styles.dropdownPanel}>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {allRooms.length === 0 ? (
                  <Text style={styles.contactsEmpty}>No rooms available.</Text>
                ) : (
                  allRooms.map((r) => (
                    <Pressable
                      key={r.id}
                      style={styles.optionRow}
                      onPress={() => {
                        setSelectedRoomId(r.id);
                        setRoomOpen(false);
                      }}
                    >
                      <Text style={styles.optionName}>{r.name}</Text>
                      {selectedRoomId === r.id && <Check width={16} height={16} />}
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </View>
          )}
        </View>

        <ContactsCard
          title="Emergency Contacts"
          contacts={emergency}
          onRequestEdit={(c) => setEditTarget({ section: 'emergency', contact: c })}
          onRequestDelete={(key) => setDeleteTarget({ section: 'emergency', key })}
          onRequestAdd={() => setAddFor('emergency')}
        />
        <ContactsCard
          title="Authorized Pickup Contacts"
          contacts={pickup}
          onRequestEdit={(c) => setEditTarget({ section: 'pickup', contact: c })}
          onRequestDelete={(key) => setDeleteTarget({ section: 'pickup', key })}
          onRequestAdd={() => setAddFor('pickup')}
        />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable style={styles.cancelBtn} onPress={goBack} disabled={saving}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.saveBtn, saving && styles.pressed, pressed && styles.pressed]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save'}</Text>
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
  valuePlaceholder: { color: Colors.gray },
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
  contactsEmpty: {
    fontFamily: Fonts.regular,
    fontSize: 13,
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
