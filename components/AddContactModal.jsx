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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChevronDown from '../assets/icons/chevron-down.svg';
import Check from '../assets/icons/check.svg';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { COUNTRIES, DEFAULT_COUNTRY } from '../constants/countries';
import { Colors, Fonts, Spacing, Radii } from '../constants/theme';

const RELATIONS = ['Mother', 'Father', 'Grandparent', 'Guardian', 'Sibling', 'Other'];

export default function AddContactModal({
  visible,
  title = 'Add Contact',
  contact,
  onClose,
  onSave,
  relationFree = false, // render Relation as a free-text field instead of a dropdown
  nameFirst = false, // show the Name field above the Relation field
  nameLabel = 'Full Name',
  namePlaceholder = 'Enter contact name',
}) {
  const isEdit = !!contact;
  const [relation, setRelation] = useState(null);
  const [name, setName] = useState('');
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [number, setNumber] = useState('');
  const [open, setOpen] = useState(null); // 'relation' | 'country' | null
  const keyboardHeight = useKeyboardHeight();
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(shift, {
      toValue: -keyboardHeight,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [keyboardHeight, shift]);

  const reset = () => {
    setRelation(null);
    setName('');
    setCountry(DEFAULT_COUNTRY);
    setNumber('');
    setOpen(null);
  };

  useEffect(() => {
    if (!visible) return;
    if (contact) {
      // Prefill from the contact being edited ("Relation – Name", "+dial number").
      const [rel, ...rest] = (contact.label || '').split('–');
      setRelation(rel?.trim() || null);
      setName(rest.join('–').trim());
      const sp = (contact.phone || '').indexOf(' ');
      const dial = sp > 0 ? contact.phone.slice(0, sp) : '';
      const num = sp > 0 ? contact.phone.slice(sp + 1) : contact.phone || '';
      setCountry(COUNTRIES.find((c) => c.dial === dial) || DEFAULT_COUNTRY);
      setNumber(num);
      setOpen(null);
    } else {
      reset();
    }
  }, [visible, contact]);

  const relationValid = relationFree ? !!(relation && relation.trim()) : !!relation;
  const canSave = relationValid && name.trim() && number.trim();

  const build = () => ({
    label: `${relation} – ${name.trim()}`,
    phone: `${country.dial} ${number.trim()}`,
  });

  const save = () => {
    if (!canSave) return;
    onSave(build());
    onClose();
  };

  const saveAndAddAnother = () => {
    if (!canSave) return;
    onSave(build());
    reset();
  };

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
              <Text style={styles.title}>{title}</Text>

              {(() => {
                const relationField = (
                  <View style={styles.fieldGroup} key="relation">
                    <Text style={styles.label}>Relation</Text>
                    {relationFree ? (
                      <View style={styles.inputBox}>
                        <TextInput
                          style={styles.input}
                          value={relation || ''}
                          onChangeText={setRelation}
                          placeholder="Enter relation type"
                          placeholderTextColor={Colors.gray}
                        />
                      </View>
                    ) : (
                      <>
                        <Pressable
                          style={[styles.inputBox, open === 'relation' && styles.inputBoxOpen]}
                          onPress={() => setOpen((o) => (o === 'relation' ? null : 'relation'))}
                        >
                          <View style={styles.row}>
                            <Text style={[styles.placeholder, relation && styles.filled]}>
                              {relation || 'Select relation'}
                            </Text>
                            <ChevronDown
                              width={24}
                              height={24}
                              style={open === 'relation' ? styles.up : undefined}
                            />
                          </View>
                        </Pressable>
                        {open === 'relation' && (
                          <View style={styles.panel}>
                            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                              {RELATIONS.map((r) => (
                                <Pressable
                                  key={r}
                                  style={styles.optionRow}
                                  onPress={() => {
                                    setRelation(r);
                                    setOpen(null);
                                  }}
                                >
                                  <Text style={styles.optionName}>{r}</Text>
                                  {relation === r && <Check width={16} height={16} />}
                                </Pressable>
                              ))}
                            </ScrollView>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                );

                const nameField = (
                  <View style={styles.fieldGroup} key="name">
                    <Text style={styles.label}>{nameLabel}</Text>
                    <View style={styles.inputBox}>
                      <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder={namePlaceholder}
                        placeholderTextColor={Colors.gray}
                      />
                    </View>
                  </View>
                );

                return nameFirst ? [nameField, relationField] : [relationField, nameField];
              })()}

              {/* Phone */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.phoneRow}>
                  <Pressable
                    style={[styles.codeBox, open === 'country' && styles.inputBoxOpen]}
                    onPress={() => setOpen((o) => (o === 'country' ? null : 'country'))}
                  >
                    <Text style={styles.filled}>{country.dial}</Text>
                    <ChevronDown
                      width={20}
                      height={20}
                      style={open === 'country' ? styles.up : undefined}
                    />
                  </Pressable>
                  <View style={[styles.inputBox, styles.numberBox]}>
                    <TextInput
                      style={styles.input}
                      value={number}
                      onChangeText={setNumber}
                      placeholder="100 123 4567"
                      placeholderTextColor={Colors.gray}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
                {open === 'country' && (
                  <View style={styles.panel}>
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                      {COUNTRIES.map((c) => (
                        <Pressable
                          key={c.dial + c.name}
                          style={styles.optionRow}
                          onPress={() => {
                            setCountry(c);
                            setOpen(null);
                          }}
                        >
                          <Text style={styles.optionName}>
                            {c.name} ({c.dial})
                          </Text>
                          {country.name === c.name && <Check width={16} height={16} />}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.saveBtn,
                  !canSave && styles.saveBtnDisabled,
                  pressed && canSave && styles.pressed,
                ]}
                onPress={save}
                disabled={!canSave}
              >
                <Text style={styles.saveText}>{isEdit ? 'Save Changes' : 'Save'}</Text>
              </Pressable>
              {!isEdit && (
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={saveAndAddAnother}
                  disabled={!canSave}
                >
                  <Text style={[styles.secondaryText, !canSave && styles.secondaryTextDisabled]}>
                    Save, and add another
                  </Text>
                </Pressable>
              )}
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radii.button,
    borderTopRightRadius: Radii.button,
    maxHeight: '90%',
  },
  content: { padding: Spacing.md, gap: Spacing.md },
  title: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 20, color: Colors.textBlack },
  fieldGroup: { gap: Spacing.sm + 4 },
  label: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 16, color: Colors.textBlack },
  inputBox: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.sm + 4,
    justifyContent: 'center',
  },
  inputBoxOpen: { backgroundColor: Colors.tapsBg, borderColor: Colors.primary },
  input: { padding: 0, fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  placeholder: { flexShrink: 1, fontFamily: Fonts.regular, fontSize: 14, color: Colors.gray },
  filled: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },
  up: { transform: [{ rotate: '180deg' }] },
  phoneRow: { flexDirection: 'row', gap: Spacing.sm },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    height: 48,
    paddingHorizontal: Spacing.sm + 4,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
  },
  numberBox: { flex: 1 },
  panel: {
    maxHeight: 168,
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
  saveText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.white },
  secondaryBtn: { height: 40, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 14, color: Colors.primary },
  secondaryTextDisabled: { color: Colors.gray },
});
