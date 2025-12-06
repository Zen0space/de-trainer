# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ===================================
# React Native Core Rules (2025)
# ===================================

# Keep React Native classes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep TurboModules (New Architecture)
-keep class com.facebook.react.turbomodule.** { *; }
-keep interface com.facebook.react.turbomodule.** { *; }

# Keep Fabric components (New Architecture)
-keep class com.facebook.react.fabric.** { *; }
-keep class com.facebook.react.uimanager.** { *; }

# Keep JSI
-keep class com.facebook.jsi.** { *; }

# Keep native modules
-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactProp <methods>;
    @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>;
}

# Keep native module methods
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod <methods>;
}

# Keep classes that are used via reflection
-keepclassmembers class * {
    @com.facebook.react.bridge.ReadableType <fields>;
}

# ===================================
# React Native Reanimated
# ===================================
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.common.** { *; }

# ===================================
# Expo Modules
# ===================================
-keep class expo.modules.** { *; }
-keep class com.facebook.react.** { *; }

# Keep Expo module registry
-keepclassmembers class * {
    @expo.modules.core.interfaces.** <methods>;
}

# ===================================
# Hermes Engine
# ===================================
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# ===================================
# OkHttp & Networking
# ===================================
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# ===================================
# Fresco Image Library
# ===================================
-keep class com.facebook.imagepipeline.** { *; }
-keep class com.facebook.fresco.** { *; }

# ===================================
# SQLite (op-sqlite)
# ===================================
-keep class com.op.sqlite.** { *; }

# ===================================
# Kotlin
# ===================================
-keep class kotlin.** { *; }
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**
-keepclassmembers class **$WhenMappings {
    <fields>;
}
-keepclassmembers class kotlin.Metadata {
    public <methods>;
}

# ===================================
# General Android Rules
# ===================================

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep custom views
-keep public class * extends android.view.View {
    public <init>(android.content.Context);
    public <init>(android.content.Context, android.util.AttributeSet);
    public <init>(android.content.Context, android.util.AttributeSet, int);
    public void set*(...);
}

# Keep Parcelables
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Keep Serializable
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ===================================
# Debugging & Stack Traces
# ===================================

# Keep source file names and line numbers for better crash reports
-keepattributes SourceFile,LineNumberTable

# Keep annotations
-keepattributes *Annotation*

# Keep generic signatures for reflection
-keepattributes Signature

# Keep exception information
-keepattributes Exceptions

# ===================================
# Add any project specific keep options here:
# ===================================
