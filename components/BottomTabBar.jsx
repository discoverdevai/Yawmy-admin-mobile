import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeFilled from '../assets/icons/home.svg';
import HomeOutline from '../assets/icons/home-outline.svg';
import RoomsActive from '../assets/icons/tab-rooms-active.svg';
import RoomsOutline from '../assets/icons/tab-rooms.svg';
import Messages from '../assets/icons/messages.svg';
import Enrollment from '../assets/icons/tab-enrollment.svg';
import Element from '../assets/icons/element.svg';
import { Colors, Fonts, Radii, Spacing } from '../constants/theme';

function TabItem({ active, ActiveIcon, InactiveIcon, label, onPress }) {
  const Icon = active ? ActiveIcon : InactiveIcon;
  return (
    <Pressable style={styles.tabItem} onPress={onPress}>
      <Icon width={24} height={24} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

export default function BottomTabBar({ active }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const go = (route) => {
    if (route) router.replace(route);
  };

  return (
    <View
      style={[
        styles.tabBar,
        { height: 64 + insets.bottom, paddingBottom: insets.bottom },
      ]}
    >
      <TabItem
        active={active === 'home'}
        ActiveIcon={HomeFilled}
        InactiveIcon={HomeOutline}
        label="Home"
        onPress={() => go('/home')}
      />
      <TabItem
        active={active === 'rooms'}
        ActiveIcon={RoomsActive}
        InactiveIcon={RoomsOutline}
        label="Rooms"
        onPress={() => go('/rooms')}
      />

      <View style={styles.spotlightWrap}>
        <Pressable style={styles.spotlightRing} onPress={() => go('/chat')}>
          <View style={styles.spotlight}>
            <Messages width={24} height={24} />
          </View>
        </Pressable>
      </View>

      <TabItem
        active={active === 'enrollment'}
        ActiveIcon={Enrollment}
        InactiveIcon={Enrollment}
        label="Enrollment"
        onPress={() => go('/enrollment')}
      />
      <TabItem
        active={active === 'more'}
        ActiveIcon={Element}
        InactiveIcon={Element}
        label="More"
        onPress={() => go('/more')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secStroke,
    borderTopLeftRadius: Radii.button,
    borderTopRightRadius: Radii.button,
    shadowColor: '#2D2D2D',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
  tabLabel: { fontFamily: Fonts.medium, fontSize: 12, color: Colors.gray },
  tabLabelActive: { color: Colors.primary },
  spotlightWrap: { flex: 1, alignItems: 'center' },
  spotlightRing: {
    marginTop: -32,
    padding: 4,
    borderRadius: 100,
    backgroundColor: Colors.background,
  },
  spotlight: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00AA5B',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
