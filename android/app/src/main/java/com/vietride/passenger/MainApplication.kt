package com.vietride.passenger

import android.app.Application
import android.content.res.Configuration

// @generated begin vietride-google-maps-import - expo prebuild (DO NOT MODIFY) sync-fbc955df229321b98547425563fb89de10cafeb1
import com.google.android.gms.maps.MapsApiSettings
import com.google.android.gms.maps.MapsInitializer
// @generated end vietride-google-maps-import
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactNativeHost

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ReactNativeHostWrapper

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
      this,
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
            }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      }
  )

  override val reactHost: ReactHost
    get() = ReactNativeHostWrapper.createReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
// @generated begin vietride-google-maps-init - expo prebuild (DO NOT MODIFY) sync-3ff0f0bbcc1e307d0fc9272170c13439c5c8c13b
    MapsApiSettings.addInternalUsageAttributionId(applicationContext, "gmp_git_agentskills_v1")
    MapsInitializer.initialize(applicationContext, MapsInitializer.Renderer.LATEST, null)
// @generated end vietride-google-maps-init
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
