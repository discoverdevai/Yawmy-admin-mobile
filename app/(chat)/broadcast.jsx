import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import ShareNursery from '../../assets/icons/share-nursery.svg';
import ShareRoom from '../../assets/icons/share-room.svg';
import RoomSelectModal from '../../components/RoomSelectModal';
import { useRooms } from '../../context/RoomsContext';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

export default function Broadcast() {
  const router = useRouter();
  const { rooms } = useRooms();

  const [shareWith, setShareWith] = useState(null); // 'nursery' | 'room'
  const [roomId, setRoomId] = useState(null);
  const [showRoom, setShowRoom] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const selectedRoom = rooms.find((r) => r.id === roomId);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/chat');
  };

  const onPickSpecificRoom = () => {
    setShareWith('room');
    setShowRoom(true);
  };

  const valid =
    name.trim() &&
    description.trim() &&
    (shareWith === 'nursery' || (shareWith === 'room' && roomId));

  const sendBroadcast = () => {
    if (!valid) return;
    router.replace('/chat');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Send Broadcast</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Share with */}
        <View style={styles.field}>
          <Text style={styles.label}>Share With</Text>
          <View style={styles.shareRow}>
            <Pressable
              style={[styles.shareCard, shareWith === 'nursery' && styles.shareCardOn]}
              onPress={() => setShareWith('nursery')}
            >
              <ShareNursery width={40} height={40} />
              <Text style={[styles.shareText, shareWith === 'nursery' && styles.shareTextOn]}>
                Nursery-Wide
              </Text>
            </Pressable>
            <Pressable
              style={[styles.shareCard, shareWith === 'room' && styles.shareCardOn]}
              onPress={onPickSpecificRoom}
            >
              <ShareRoom width={40} height={40} />
              <Text style={[styles.shareText, shareWith === 'room' && styles.shareTextOn]}>
                Specific Room
              </Text>
            </Pressable>
          </View>

          {shareWith === 'room' && selectedRoom && (
            <Pressable style={styles.roomChip} onPress={() => setShowRoom(true)}>
              <Text style={styles.roomChipText}>{selectedRoom.name}</Text>
              <Text style={styles.roomChipChange}>Change</Text>
            </Pressable>
          )}
        </View>

        {/* Broadcast name */}
        <View style={styles.field}>
          <Text style={styles.label}>Broadcast Name</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter broadcast name"
              placeholderTextColor={Colors.gray}
            />
          </View>
        </View>

        {/* Broadcast description */}
        <View style={styles.field}>
          <Text style={styles.label}>Broadcast Description</Text>
          <View style={styles.textareaBox}>
            <TextInput
              style={styles.textarea}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter broadcast description"
              placeholderTextColor={Colors.gray}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.cta, !valid && styles.ctaDisabled]}
          onPress={sendBroadcast}
          disabled={!valid}
        >
          <Text style={styles.ctaText}>Send Broadcast</Text>
        </Pressable>
      </View>

      <RoomSelectModal
        visible={showRoom}
        rooms={rooms}
        initialRoomId={roomId}
        subtitle="Choose a room to send the broadcast to ."
        onClose={() => setShowRoom(false)}
        onConfirm={(id) => {
          setRoomId(id);
          setShowRoom(false);
        }}
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

  content: { padding: Spacing.md, paddingBottom: Spacing.lg, gap: Spacing.lg },
  field: { gap: Spacing.sm + 4 },
  label: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 16, color: Colors.textBlack },

  shareRow: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'space-between' },
  shareCard: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.sm + 4,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
  },
  shareCardOn: { backgroundColor: Colors.primaryBgLight, borderColor: Colors.primary },
  shareText: { fontFamily: Fonts.bold, fontWeight: '600', fontSize: 16, color: Colors.textBlack },
  shareTextOn: { color: Colors.primaryText },

  roomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: Spacing.sm + 4,
    borderRadius: Radii.button,
    backgroundColor: Colors.primaryBgLight,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  roomChipText: { fontFamily: Fonts.medium, fontWeight: '600', fontSize: 14, color: Colors.primaryText },
  roomChipChange: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 12, color: Colors.accent },

  inputBox: {
    height: 48,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    paddingHorizontal: Spacing.sm + 4,
  },
  input: { padding: 0, fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },

  textareaBox: {
    height: 129,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    padding: Spacing.sm + 4,
  },
  textarea: { flex: 1, padding: 0, fontFamily: Fonts.regular, fontSize: 14, color: Colors.textBlack },

  footer: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  cta: {
    height: 48,
    borderRadius: Radii.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { backgroundColor: Colors.disabledButton },
  ctaText: { fontFamily: Fonts.bold, fontWeight: '700', fontSize: 16, color: Colors.white },
});
