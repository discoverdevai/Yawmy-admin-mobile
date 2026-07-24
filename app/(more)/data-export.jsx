import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArrowLeft from '../../assets/icons/arrow-left.svg';
import Records from '../../assets/icons/data-records.svg';
import Attendance from '../../assets/icons/more-attendance.svg';
import Incident from '../../assets/icons/more-incident.svg';
import Export from '../../assets/icons/more-export.svg';
import ExportChildModal from '../../components/ExportChildModal';
import ExportAttendanceModal from '../../components/ExportAttendanceModal';
import ExportIncidentModal from '../../components/ExportIncidentModal';
import SuccessModal from '../../components/SuccessModal';
import { useAuth } from '../../context/AuthContext';
import { getRooms } from '../../services/roomsService';
import { getChildren } from '../../services/childrenService';
import { Colors, Fonts, Spacing, Radii } from '../../constants/theme';

const ITEMS = [
  { key: 'child', label: 'Child Records', Icon: Records },
  { key: 'attendance', label: 'Attendance Logs', Icon: Attendance },
  { key: 'incident', label: 'Incident Log', Icon: Incident },
];

export default function DataExport() {
  const router = useRouter();
  const { token } = useAuth();
  const [showChild, setShowChild] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [showIncident, setShowIncident] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Real rooms + children (with backend UUIDs) for the export modals.
  const [exportRooms, setExportRooms] = useState([]);
  const [exportChildren, setExportChildren] = useState([]);
  useEffect(() => {
    getRooms(false)
      .then((r) => setExportRooms((r || []).map((x) => ({ id: x.id, name: x.name }))))
      .catch(() => {});
    getChildren()
      .then((c) =>
        setExportChildren(
          (c || []).map((x) => ({ id: x.id, name: x.fullName, roomId: x.roomId, room: x.roomName || '—' }))
        )
      )
      .catch(() => {});
  }, []);

  // Auto-dismiss the themed download confirmation.
  useEffect(() => {
    if (!showSuccess) return;
    const t = setTimeout(() => setShowSuccess(false), 2200);
    return () => clearTimeout(t);
  }, [showSuccess]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/more');
  };

  const onRow = (key) => {
    if (key === 'child') setShowChild(true);
    else if (key === 'attendance') setShowAttendance(true);
    else if (key === 'incident') setShowIncident(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <ArrowLeft width={24} height={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Data Export</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {ITEMS.map(({ key, label, Icon }) => (
          <Pressable
            key={key}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() => onRow(key, label)}
          >
            <View style={styles.rowLeft}>
              <Icon width={24} height={24} />
              <Text style={styles.rowLabel}>{label}</Text>
            </View>
            <Export width={24} height={24} />
          </Pressable>
        ))}
      </ScrollView>

      <ExportChildModal
        visible={showChild}
        rooms={exportRooms}
        token={token}
        onClose={() => setShowChild(false)}
        onDownloaded={() => setShowSuccess(true)}
      />

      <ExportAttendanceModal
        visible={showAttendance}
        childList={exportChildren}
        rooms={exportRooms}
        token={token}
        onClose={() => setShowAttendance(false)}
        onDownloaded={() => setShowSuccess(true)}
      />

      <ExportIncidentModal
        visible={showIncident}
        childList={exportChildren}
        rooms={exportRooms}
        token={token}
        onClose={() => setShowIncident(false)}
        onDownloaded={() => setShowSuccess(true)}
      />

      <SuccessModal
        visible={showSuccess}
        title="Export Successful!"
        message="Your file has been saved to your device."
        buttonText=""
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

  list: { padding: Spacing.md, gap: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: Spacing.sm + 4,
    borderWidth: 1,
    borderColor: Colors.stroke,
    borderRadius: Radii.button,
  },
  pressed: { opacity: 0.85 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowLabel: { fontFamily: Fonts.medium, fontWeight: '500', fontSize: 16, color: Colors.textBlack },
});
