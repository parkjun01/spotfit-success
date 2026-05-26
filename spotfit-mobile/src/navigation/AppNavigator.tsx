import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector, useDispatch } from 'react-redux';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState, AppDispatch } from '../store/store';
import { loadUser } from '../store/slices/authSlice';
import { COLORS } from '../utils/constants';

// Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { MapScreen } from '../screens/home/MapScreen';
import { SpotDetailScreen } from '../screens/spot/SpotDetailScreen';
import { SpotChatScreen } from '../screens/spot/SpotChatScreen';
import { CreateSpotScreen } from '../screens/spot/CreateSpotScreen';
import { RankingScreen } from '../screens/ranking/RankingScreen';
import { MyPageScreen } from '../screens/mypage/MyPageScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => (
  <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{name}</Text>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textSecondary,
      tabBarStyle: { borderTopColor: COLORS.border, height: 60, paddingBottom: 8 },
      headerStyle: { backgroundColor: COLORS.surface },
      headerTitleStyle: { fontWeight: '700', color: COLORS.text },
    }}
  >
    <Tab.Screen
      name="Map"
      component={MapScreen}
      options={{
        title: '스팟 찾기',
        tabBarIcon: ({ focused }) => <TabIcon name="🗺️" focused={focused} />,
        tabBarLabel: '지도',
      }}
    />
    <Tab.Screen
      name="Ranking"
      component={RankingScreen}
      options={{
        title: '랭킹',
        tabBarIcon: ({ focused }) => <TabIcon name="🏆" focused={focused} />,
        tabBarLabel: '랭킹',
      }}
    />
    <Tab.Screen
      name="MyPage"
      component={MyPageScreen}
      options={{
        title: '마이페이지',
        tabBarIcon: ({ focused }) => <TabIcon name="👤" focused={focused} />,
        tabBarLabel: '마이',
      }}
    />
  </Tab.Navigator>
);

export const AppNavigator = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated } = useSelector((s: RootState) => s.auth);

  useEffect(() => {
    AsyncStorage.getItem('access_token').then(token => {
      if (token) dispatch(loadUser());
    });
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerBackTitle: '', headerTintColor: COLORS.primary }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="SpotDetail" component={SpotDetailScreen} options={{ title: '스팟 상세' }} />
            <Stack.Screen name="SpotChat" component={SpotChatScreen} options={({ route }: any) => ({ title: route.params?.spotTitle || '채팅' })} />
            <Stack.Screen name="CreateSpot" component={CreateSpotScreen} options={{ title: '스팟 생성' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
