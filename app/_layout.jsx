import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../context/AuthContext';
import { DataProvider } from '../context/DataContext';
import { SetupProvider } from '../context/SetupContext';
import { NotificationsProvider } from '../context/NotificationsContext';
import { RoomsProvider } from '../context/RoomsContext';
import { EnrollmentProvider } from '../context/EnrollmentContext';
import { AnnouncementsProvider } from '../context/AnnouncementsContext';
import { EventsProvider } from '../context/EventsContext';
import { paperTheme } from '../constants/theme';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...paperTheme.colors,
  },
};

export default function RootLayout() {
  // TODO: once the Recoleta font files are added to assets/fonts, load them
  // here with expo-font's useFonts and gate rendering on `fontsLoaded`.
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <DataProvider>
            <SetupProvider>
              <NotificationsProvider>
                <RoomsProvider>
                  <EnrollmentProvider>
                    <AnnouncementsProvider>
                      <EventsProvider>
                        <Stack screenOptions={{ headerShown: false }} />
                      </EventsProvider>
                    </AnnouncementsProvider>
                  </EnrollmentProvider>
                </RoomsProvider>
              </NotificationsProvider>
            </SetupProvider>
          </DataProvider>
        </AuthProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
