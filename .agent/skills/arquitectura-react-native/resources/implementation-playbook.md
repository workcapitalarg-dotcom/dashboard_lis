# Playbook de Implementación de Arquitectura de React Native

Este archivo contiene patrones detallados, listas de verificación y ejemplos de código referenciados por la habilidad de arquitectura.

## Conceptos Core

### 1. Estructura del Proyecto

```
src/
├── app/                    # Pantallas de Expo Router
│   ├── (auth)/            # Grupo de autenticación
│   ├── (tabs)/            # Navegación por pestañas
│   └── _layout.tsx        # Layout raíz
├── components/
│   ├── ui/                # Componentes de UI reutilizables
│   └── features/          # Componentes específicos por característica
├── hooks/                 # Hooks personalizados
├── services/              # API y servicios nativos
├── stores/                # Gestión de estado
├── utils/                 # Utilidades
└── types/                 # Tipos de TypeScript
```

### 2. Expo vs Bare React Native

| Característica | Expo | Bare RN |
|---------|------|---------|
| Complejidad de configuración | Baja | Alta |
| Módulos nativos | EAS Build | Vinculación manual |
| Actualizaciones OTA | Integrado | Configuración manual |
| Servicio de construcción | EAS | CI personalizado |
| Código nativo personalizado | Plugins de configuración | Acceso directo |

## Inicio Rápido

```bash
# Crear nuevo proyecto de Expo
npx create-expo-app@latest my-app -t expo-template-blank-typescript

# Instalar dependencias esenciales
npx expo install expo-router expo-status-bar react-native-safe-area-context
npx expo install @react-native-async-storage/async-storage
npx expo install expo-secure-store expo-haptics
```

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { QueryProvider } from '@/providers/QueryProvider'

export default function RootLayout() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </QueryProvider>
  )
}
```

## Patrones

### Patrón 1: Navegación con Expo Router

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'
import { Home, Search, User, Settings } from 'lucide-react-native'
import { useTheme } from '@/hooks/useTheme'

export default function TabLayout() {
  const { colors } = useTheme()

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.background },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}

// app/(tabs)/profile/[id].tsx - Ruta dinámica
import { useLocalSearchParams } from 'expo-router'

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  return <UserProfile userId={id} />
}
```

### Patrón 2: Flujo de Autenticación

```typescript
// providers/AuthProvider.tsx
// Ejemplo simplificado de AuthProvider usando SecureStore y Expo Router
```

### Patrón 3: Offline-First con React Query

```typescript
// Configuración de sincronización de estado online y persistencia en AsyncStorage
```

### Patrón 4: Integración de Módulos Nativos

```typescript
// Ejemplo de servicios para Haptics, Biometría y Notificaciones Push
```

### Patrón 5: Código específico por plataforma

```typescript
// Uso de Platform.select y archivos .ios.tsx / .android.tsx
```

### Patrón 6: Optimización de Rendimiento

```typescript
// Uso de FlashList y memoización de componentes de lista
```

## EAS Build & Submit

Configuración para compilaciones en la nube y envíos a tiendas usando EAS (Expo Application Services).

## Mejores Prácticas

### Qué hacer (Do's)
- **Usa Expo**: Desarrollo más rápido, actualizaciones OTA, código nativo gestionado.
- **FlashList sobre FlatList**: Mejor rendimiento para listas largas.
- **Memoriza componentes**: Evita re-renderizados innecesarios.
- **Usa Reanimated**: Animaciones a 60fps en el hilo nativo.
- **Prueba en dispositivos reales**: Los simuladores omiten problemas del mundo real.

### Qué NO hacer (Don'ts)
- **No uses estilos inline**: Usa `StyleSheet.create` por rendimiento.
- **No hagas fetch en el render**: Usa `useEffect` o React Query.
- **No ignores las diferencias de plataforma**: Prueba tanto en iOS como en Android.
- **No guardes secretos en el código**: Usa variables de entorno.
- **No olvides los Error Boundaries**: Los crashes en móviles no perdonan.

## Recursos

- [Documentación de Expo](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Rendimiento en React Native](https://reactnative.dev/docs/performance)
- [FlashList](https://shopify.github.io/flash-list/)
