package com.brand

import android.app.Application
import android.os.Environment
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import java.io.File

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    SoLoader.init(this, OpenSourceMergedSoMapping)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
    
    // Create app directories in both internal and external storage
    createAppDirectories()
  }
  
  private fun createAppDirectories() {
    try {
      // Create app directory in internal storage
      val internalDir = File(filesDir, "brand")
      if (!internalDir.exists()) {
        val created = internalDir.mkdirs()
        Log.d("BrandApp", "Internal storage directory created: $created at ${internalDir.absolutePath}")
      } else {
        Log.d("BrandApp", "Internal storage directory already exists at ${internalDir.absolutePath}")
      }
      
      // Create app directory in external storage
      if (Environment.getExternalStorageState() == Environment.MEDIA_MOUNTED) {
        val externalDir = File(Environment.getExternalStorageDirectory(), "brand")
        if (!externalDir.exists()) {
          val created = externalDir.mkdirs()
          Log.d("BrandApp", "External storage directory created: $created at ${externalDir.absolutePath}")
        } else {
          Log.d("BrandApp", "External storage directory already exists at ${externalDir.absolutePath}")
        }
      }
      
      // Create app directory in secondary external storage (Android 4.4+)
      val externalFilesDir = getExternalFilesDir(null)
      if (externalFilesDir != null) {
        val appDir = File(externalFilesDir, "brand")
        if (!appDir.exists()) {
          val created = appDir.mkdirs()
          Log.d("BrandApp", "App-specific external directory created: $created at ${appDir.absolutePath}")
        } else {
          Log.d("BrandApp", "App-specific external directory already exists at ${appDir.absolutePath}")
        }
      }
    } catch (e: Exception) {
      Log.e("BrandApp", "Error creating directories", e)
    }
  }
}
