package com.vietride.places

import android.content.pm.PackageManager
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.tasks.CancellationTokenSource
import com.google.android.libraries.places.api.Places
import com.google.android.libraries.places.api.model.AutocompleteSessionToken
import com.google.android.libraries.places.api.model.CircularBounds
import com.google.android.libraries.places.api.model.Place
import com.google.android.libraries.places.api.net.FetchPlaceRequest
import com.google.android.libraries.places.api.net.FindAutocompletePredictionsRequest
import com.google.android.libraries.places.api.net.PlacesClient
import com.google.android.libraries.places.api.net.PlacesStatusCodes
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

class FindPredictionsArgs : Record {
  @Field
  var sessionId: String = ""

  @Field
  var query: String = ""

  @Field
  var latitude: Double? = null

  @Field
  var longitude: Double? = null

  @Field
  var radiusMeters: Double? = null

  @Field
  var countryCode: String? = null

  @Field
  var maxResults: Int? = null
}

class ResolvePlaceArgs : Record {
  @Field
  var sessionId: String = ""

  @Field
  var placeId: String = ""

  /**
   * When true (default), autocomplete session is closed after a successful details fetch.
   * Map-pin previews should pass false (and may omit sessionId) so multiple pins can load.
   */
  @Field
  var endSession: Boolean = true
}

class VietRidePlacesModule : Module() {
  private val sessions = ConcurrentHashMap<String, AutocompleteSessionToken>()
  private val activeCancellations = ConcurrentHashMap<String, CancellationTokenSource>()
  private var placesClient: PlacesClient? = null

  override fun definition() = ModuleDefinition {
    Name("VietRidePlaces")

    OnDestroy {
      activeCancellations.values.forEach { it.cancel() }
      activeCancellations.clear()
      sessions.clear()
      placesClient = null
    }

    AsyncFunction("beginSession") { promise: Promise ->
      try {
        ensurePlacesInitialized()
        val sessionId = UUID.randomUUID().toString()
        sessions[sessionId] = AutocompleteSessionToken.newInstance()
        promise.resolve(sessionId)
      } catch (error: Exception) {
        promise.reject(mapException(error))
      }
    }

    AsyncFunction("findPredictions") { args: FindPredictionsArgs, promise: Promise ->
      try {
        val client = ensurePlacesInitialized()
        val sessionId = args.sessionId.trim()
        val query = args.query.trim()
        if (sessionId.isEmpty()) {
          throw PlacesCodedException("INVALID_SESSION", "A Places session is required.")
        }
        if (query.isEmpty()) {
          promise.resolve(emptyList<Map<String, String>>())
          return@AsyncFunction
        }

        val token = sessions[sessionId]
          ?: throw PlacesCodedException("INVALID_SESSION", "Places session is not active.")

        activeCancellations.remove(sessionId)?.cancel()
        val cancellation = CancellationTokenSource()
        activeCancellations[sessionId] = cancellation

        val builder = FindAutocompletePredictionsRequest.builder()
          .setQuery(query)
          .setSessionToken(token)
          .setCancellationToken(cancellation.token)

        val latitude = args.latitude
        val longitude = args.longitude
        if (latitude != null && longitude != null) {
          val center = LatLng(latitude, longitude)
          val radius = (args.radiusMeters ?: DEFAULT_BIAS_RADIUS_METERS).coerceIn(1.0, 50_000.0)
          builder.setLocationBias(CircularBounds.newInstance(center, radius))
          builder.setOrigin(center)
        }

        val country = args.countryCode?.trim()?.lowercase()
        if (!country.isNullOrEmpty()) {
          builder.setCountries(listOf(country))
        }

        client.findAutocompletePredictions(builder.build())
          .addOnSuccessListener { response ->
            if (cancellation.token.isCancellationRequested) {
              // Every Expo Promise must settle. JS request sequencing ignores
              // this stale empty result after a newer query starts.
              promise.resolve(emptyList<Map<String, String>>())
              return@addOnSuccessListener
            }
            val limit = (args.maxResults ?: DEFAULT_MAX_RESULTS).coerceIn(1, 5)
            val payload = response.autocompletePredictions
              .take(limit)
              .map { prediction ->
                mapOf(
                  "placeId" to prediction.placeId,
                  "primaryText" to prediction.getPrimaryText(null).toString(),
                  "secondaryText" to prediction.getSecondaryText(null).toString(),
                  "fullText" to prediction.getFullText(null).toString(),
                )
              }
            promise.resolve(payload)
          }
          .addOnFailureListener { error ->
            if (cancellation.token.isCancellationRequested) {
              promise.resolve(emptyList<Map<String, String>>())
              return@addOnFailureListener
            }
            promise.reject(mapException(error))
          }
          .addOnCompleteListener {
            activeCancellations.remove(sessionId, cancellation)
          }
      } catch (error: Exception) {
        promise.reject(mapException(error))
      }
    }

    AsyncFunction("resolvePlace") { args: ResolvePlaceArgs, promise: Promise ->
      try {
        val client = ensurePlacesInitialized()
        val sessionId = args.sessionId.trim()
        val placeId = args.placeId.trim()
        if (placeId.isEmpty()) {
          throw PlacesCodedException("INVALID_PLACE", "A place identifier is required.")
        }

        // Session is optional: map pin previews resolve without a session so multiple
        // markers can load without closing the autocomplete session early.
        val token = if (sessionId.isEmpty()) {
          null
        } else {
          sessions[sessionId]
            ?: throw PlacesCodedException("INVALID_SESSION", "Places session is not active.")
        }

        val requestBuilder = FetchPlaceRequest.builder(placeId, PLACE_FIELDS)
        if (token != null) {
          requestBuilder.setSessionToken(token)
        }
        val request = requestBuilder.build()

        client.fetchPlace(request)
          .addOnSuccessListener { response ->
            val place = response.place
            val location = place.location
            if (location == null) {
              promise.reject(
                PlacesCodedException(
                  "INVALID_PLACE",
                  "Place coordinates are unavailable for id=$placeId",
                ),
              )
              return@addOnSuccessListener
            }
            // Prefer Places fields; never invent a name when both are blank.
            val displayName = place.displayName?.takeIf { it.isNotBlank() }
              ?: place.formattedAddress?.takeIf { it.isNotBlank() }
              ?: ""
            val formattedAddress = place.formattedAddress?.takeIf { it.isNotBlank() }
              ?: displayName
            if (displayName.isBlank() || formattedAddress.isBlank()) {
              promise.reject(
                PlacesCodedException(
                  "INVALID_PLACE",
                  "Place address details are incomplete for id=$placeId",
                ),
              )
              return@addOnSuccessListener
            }

            if (args.endSession && sessionId.isNotEmpty()) {
              sessions.remove(sessionId)
              activeCancellations.remove(sessionId)?.cancel()
            }

            // Box as Double so the JS bridge always receives finite numbers.
            promise.resolve(
              mapOf(
                "placeId" to placeId,
                "displayName" to displayName,
                "formattedAddress" to formattedAddress,
                "latitude" to location.latitude.toDouble(),
                "longitude" to location.longitude.toDouble(),
              ),
            )
          }
          .addOnFailureListener { error ->
            promise.reject(mapException(error))
          }
      } catch (error: Exception) {
        promise.reject(mapException(error))
      }
    }

    AsyncFunction("endSession") { sessionId: String, promise: Promise ->
      val normalized = sessionId.trim()
      if (normalized.isNotEmpty()) {
        sessions.remove(normalized)
        activeCancellations.remove(normalized)?.cancel()
      }
      promise.resolve(null)
    }
  }

  @Synchronized
  private fun ensurePlacesInitialized(): PlacesClient {
    placesClient?.let { return it }

    val context = appContext.reactContext
      ?: throw PlacesCodedException("UNAVAILABLE", "React context is not ready.")

    if (!Places.isInitialized()) {
      val apiKey = readNativeMapsApiKey(context)
        ?: throw PlacesCodedException(
          "CONFIGURATION",
          "Google Places is not configured for this build.",
        )
      try {
        Places.addInternalUsageAttributionId(GOOGLE_MAPS_USAGE_ATTRIBUTION_ID)
        Places.initializeWithNewPlacesApiEnabled(context.applicationContext, apiKey)
      } catch (error: Exception) {
        throw PlacesCodedException(
          "CONFIGURATION",
          "Google Places could not be initialized.",
          error,
        )
      }
    }

    val client = Places.createClient(context.applicationContext)
    placesClient = client
    return client
  }

  private fun readNativeMapsApiKey(context: android.content.Context): String? {
    return try {
      val applicationInfo = context.packageManager.getApplicationInfo(
        context.packageName,
        PackageManager.GET_META_DATA,
      )
      val raw = applicationInfo.metaData?.getString(ANDROID_MAPS_API_KEY_META)
        ?.trim()
        .orEmpty()
      if (
        raw.isEmpty()
        || raw.contains("YOUR_KEY", ignoreCase = true)
        || raw.contains("PLACEHOLDER", ignoreCase = true)
        || raw.startsWith("TEST_", ignoreCase = true)
      ) {
        null
      } else {
        raw
      }
    } catch (_: Exception) {
      null
    }
  }

  private fun mapException(error: Throwable): CodedException {
    if (error is PlacesCodedException) {
      return error
    }

    if (error is ApiException) {
      return when (error.statusCode) {
        7 -> PlacesCodedException("OFFLINE", "Places requires a network connection.")
        8 -> PlacesCodedException("UNAVAILABLE", "Places is temporarily unavailable.")
        13 -> PlacesCodedException("UNAVAILABLE", "Places is temporarily unavailable.")
        STATUS_CANCELLED -> PlacesCodedException("UNAVAILABLE", "Places request was cancelled.")
        PlacesStatusCodes.OVER_QUERY_LIMIT -> PlacesCodedException("QUOTA", "Places quota has been exceeded.")
        PlacesStatusCodes.REQUEST_DENIED -> PlacesCodedException(
          "CONFIGURATION",
          "Google Places is not configured for this build.",
        )
        // Common when a Maps POI placeId is not resolvable via Place Details.
        PlacesStatusCodes.NOT_FOUND -> PlacesCodedException(
          "INVALID_PLACE",
          "Place was not found (status ${error.statusCode}).",
        )
        PlacesStatusCodes.INVALID_REQUEST -> PlacesCodedException(
          "INVALID_PLACE",
          "Invalid Google Places request (status ${error.statusCode}).",
        )
        else -> PlacesCodedException(
          "UNAVAILABLE",
          "Places request failed (status ${error.statusCode}).",
        )
      }
    }

    val message = error.message.orEmpty()
    return when {
      message.contains("API_KEY", ignoreCase = true)
        || message.contains("not authorized", ignoreCase = true)
        || message.contains("REQUEST_DENIED", ignoreCase = true) ->
        PlacesCodedException("CONFIGURATION", "Google Places is not configured for this build.")
      message.contains("OVER_QUERY_LIMIT", ignoreCase = true)
        || message.contains("RESOURCE_EXHAUSTED", ignoreCase = true) ->
        PlacesCodedException("QUOTA", "Places quota has been exceeded.")
      message.contains("Unable to resolve host", ignoreCase = true)
        || message.contains("network", ignoreCase = true)
        || message.contains("timeout", ignoreCase = true) ->
        PlacesCodedException("OFFLINE", "Places requires a network connection.")
      else -> PlacesCodedException("UNAVAILABLE", "Places request failed.")
    }
  }

  companion object {
    private const val ANDROID_MAPS_API_KEY_META = "com.google.android.geo.API_KEY"
    private const val GOOGLE_MAPS_USAGE_ATTRIBUTION_ID = "gmp_git_agentskills_v1"
    private const val STATUS_CANCELLED = 16
    private const val DEFAULT_BIAS_RADIUS_METERS = 5_000.0
    private const val DEFAULT_MAX_RESULTS = 5
    private val PLACE_FIELDS = listOf(
      Place.Field.ID,
      Place.Field.DISPLAY_NAME,
      Place.Field.FORMATTED_ADDRESS,
      Place.Field.LOCATION,
    )
  }
}

private class PlacesCodedException(
  code: String,
  message: String,
  cause: Throwable? = null,
) : CodedException(code, message, cause)
