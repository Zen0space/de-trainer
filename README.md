# DE Trainer - React Native Expo App

A React Native Expo mobile application built with TypeScript and NativeWind for cross-platform development (Android, iOS, and Web).

## Features

- ✅ **React Native Expo** - Universal app development platform
- ✅ **TypeScript** - Type-safe development
- ✅ **NativeWind** - Tailwind CSS for React Native
- ✅ **Cross-platform** - Android, iOS, and Web support
- ✅ **Modern tooling** - Latest Babel and Metro configurations

## Tech Stack

- **Framework**: Expo SDK 53
- **Language**: TypeScript 5.8
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Runtime**: React 19 & React Native 0.79

## Dependencies

### Core Dependencies
- `expo` - Universal React Native platform
- `react` & `react-native` - React Native framework

- `react-native-safe-area-context` - Safe area handling

### Development Dependencies
- `typescript` & `@types/react` - TypeScript support
- `nativewind` - Tailwind CSS for React Native
- `tailwindcss` - CSS framework

## Getting Started

### Prerequisites
- Node.js 16 or higher
- npm or yarn
- Expo CLI (optional, but recommended)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

### Platform-specific commands

- **Android**: `npm run android`
- **iOS**: `npm run ios` (macOS only)
- **Web**: `npm run web`

## Project Structure

```
jejak-atlet/
├── App.tsx                 # Main app component
├── index.ts               # App entry point
├── global.css            # Global Tailwind styles
├── tailwind.config.js    # Tailwind configuration
├── metro.config.js       # Metro bundler configuration
├── babel.config.js       # Babel configuration
├── tsconfig.json         # TypeScript configuration
├── nativewind-env.d.ts   # NativeWind type definitions
├── app.json              # Expo app configuration
└── assets/               # Static assets (images, icons)
```

## Configuration Files

### Tailwind CSS (`tailwind.config.js`)
- Configured with NativeWind preset
- Includes content paths for all component files

### Metro (`metro.config.js`)
- Enhanced with NativeWind support
- Processes CSS files for React Native

### Babel (`babel.config.js`)
- Expo preset configuration
- NativeWind v4 uses jsxImportSource transform (no Babel plugin needed)

### TypeScript (`tsconfig.json`)
- Extends Expo's base configuration
- Includes NativeWind type definitions
- Strict mode enabled

## Styling with NativeWind

Use Tailwind CSS classes directly in your React Native components:

```tsx
import { View, Text } from 'react-native';

export default function MyComponent() {
  return (
    <View className="flex-1 bg-blue-500 items-center justify-center">
      <Text className="text-white text-2xl font-bold">
        Hello NativeWind!
      </Text>
    </View>
  );
}
```

## Development

### Hot Reload
- Changes to TypeScript files trigger automatic reloads
- NativeWind styles are processed in real-time
- Expo development tools provide debugging capabilities

### Type Safety
- Full TypeScript support with strict mode
- NativeWind className props are type-safe
- Auto-completion for Tailwind classes

### Version Management

Bump the app version using the built-in scripts:

```bash
# Bump patch version (0.2.4 → 0.2.5)
npm run bump

# Bump minor version (0.2.4 → 0.3.0)
npm run bump:minor

# Bump major version (0.2.4 → 1.0.0)
npm run bump:major
```

The script automatically updates:
- `package.json` version
- `app.json` expo version

After bumping, commit and build:
```bash
git add .
git commit -m "chore: bump version to X.X.X"
eas build --platform android --profile production
```

## Building for Production

### Environment Variables

Ensure your Turso database environment variables are configured in `eas.json` for production builds:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_TURSO_DATABASE_URL": "libsql://your-database-url",
        "EXPO_PUBLIC_TURSO_AUTH_TOKEN": "your-auth-token"
      }
    }
  }
}
```

### Android
```bash
# Build APK (for testing/distribution)
expo build:android

# Build AAB (Android App Bundle) for Play Store production
eas build --platform android --profile production

# Build with custom configuration
eas build --platform android --profile production --local
```

### iOS
```bash
expo build:ios
```

### Web
```bash
expo build:web
```

## Troubleshooting

### Common Issues

1. **Metro bundler issues**: Clear cache with `npx expo start --clear`
2. **TypeScript errors**: Ensure all type definitions are properly imported
3. **NativeWind not working**: Verify babel.config.js includes the NativeWind plugin

### Helpful Commands

- Clear Expo cache: `npx expo start --clear`
- Reset Metro cache: `npx expo start --reset-cache`
- Type check: `npx tsc --noEmit`

## License

This project is private and proprietary.
