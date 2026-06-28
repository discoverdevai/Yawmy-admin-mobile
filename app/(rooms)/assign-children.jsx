import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import Search from '../../assets/icons/search.svg';
import PlusPrimary from '../../assets/icons/plus-primary.svg';
import Done from '../../assets/icons/done.svg';
import Refresh from '../../assets/icons/refresh.svg';
import AddChildModal from '../../components/AddChildModal';
import ChildNotFoundModal from '../../components/ChildNotFoundModal';
import AlreadyAssignedModal from '../../components/AlreadyAssignedModal';
import { useRooms } from '../../context/RoomsContext';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const avatar = require('../../assets/images/child-avatar.png');

export default function AssignChildren() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams();
  const { rooms, archivedRooms, toggleChild, roomOfChild, enrolledChildren } = useRooms();
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [conflict, setConflict] = useState(null); // { child, room } — child already elsewhere

  const room =
    rooms.find((r) => r.id === Number(roomId)) ||
    archivedRooms.find((r) => r.id === Number(roomId));
  const assignedIds = room?.childIds ?? [];
  const rid = Number(roomId);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/rooms');
  };

  // Assign a child to this room — but each child can only be in one room, so
  // warn (and offer to move) if they already belong to another.
  const assignChild = (child) => {
    const other = roomOfChild(child.id, rid);
    if (other) {
      setConflict({ child, room: other });
      return false;
    }
    toggleChild(rid, child.id);
    return true;
  };

  const handleToggle = (child) => {
    if (!roomId) return;
    if (assignedIds.includes(child.id)) toggleChild(rid, child.id); // unassign from this room
    else assignChild(child);
  };

  const confirmMove = () => {
    if (conflict) {
      toggleChild(rid, conflict.child.id); // adds here + removes from the other room
      setQuery(conflict.child.name);
    }
    setConflict(null);
  };

  // Add a child by name: look them up in the registered children, assign if
  // found (mark "Done"), otherwise show the "not found" prompt.
  const handleAddChild = (name) => {
    const normalize = (s) => s.trim().replace(/\s+/g, ' ').toLowerCase();
    const match = enrolledChildren.find((c) => normalize(c.name) === normalize(name));
    setShowAdd(false);
    if (!match) {
      setNotFound(true);
      return;
    }
    if (assignedIds.includes(match.id)) {
      setQuery(match.name); // already in this room
      return;
    }
    if (assignChild(match)) setQuery(match.name); // assigned, or conflict modal shown
  };

  const q = query.trim().toLowerCase();
  const filtered = enrolledChildren.filter(
    (c) => c.name.toLowerCase().includes(q) || c.childId.includes(q)
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Assign Children</Text>
      </View>

      {/* Search + add */}
      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <Search width={24} height={24} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor={Colors.gray}
          />
        </View>
        <Pressable style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <PlusPrimary width={24} height={24} />
        </Pressable>
      </View>

      {/* Children list */}
      <ScrollView
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 && (
          <Text style={styles.noResults}>No children found.</Text>
        )}
        {filtered.map((child) => {
          const assigned = assignedIds.includes(child.id);
          return (
          <View key={child.id} style={styles.card}>
            <Image source={avatar} style={styles.avatar} contentFit="cover" />
            <View style={styles.cardText}>
              <Text style={styles.name}>{child.name}</Text>
              <Text style={styles.childId}>ID: {child.childId}</Text>
            </View>
            <Pressable
              style={[styles.status, assigned ? styles.doneBadge : styles.assignBtn]}
              onPress={() => handleToggle(child)}
            >
              {assigned ? (
                <>
                  <Done width={16} height={16} />
                  <Text style={styles.doneText}>Done</Text>
                </>
              ) : (
                <>
                  <Refresh width={16} height={16} />
                  <Text style={styles.assignText}>Assign</Text>
                </>
              )}
            </Pressable>
          </View>
          );
        })}
      </ScrollView>

      <AddChildModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={handleAddChild}
      />

      <ChildNotFoundModal
        visible={notFound}
        onCancel={() => setNotFound(false)}
        onEnroll={() => setNotFound(false)}
      />

      <AlreadyAssignedModal
        visible={!!conflict}
        childName={conflict?.child.name}
        roomName={conflict?.room.name}
        onCancel={() => setConflict(null)}
        onMove={confirmMove}
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
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 20,
    color: Colors.textBlack,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 48,
    paddingHorizontal: Spacing.sm + 4,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
  },
  searchInput: {
    flex: 1,
    padding: 0,
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textBlack,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm + 4,
  },
  noResults: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
    padding: Spacing.sm,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  cardText: { flex: 1, gap: Spacing.sm },
  name: {
    fontFamily: Fonts.bold,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.textBlack,
  },
  childId: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    color: Colors.gray,
  },

  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    height: 32,
    paddingHorizontal: Spacing.sm,
    borderRadius: 8,
  },
  doneBadge: { backgroundColor: Colors.accentSecBg },
  doneText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 12,
    color: Colors.accent,
  },
  assignBtn: { backgroundColor: Colors.primary },
  assignText: {
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 12,
    color: Colors.white,
  },
});
