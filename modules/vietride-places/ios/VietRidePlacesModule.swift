import ExpoModulesCore
import Foundation

#if canImport(GooglePlaces)
import GooglePlaces
import CoreLocation
#endif

public class VietRidePlacesModule: Module {
  #if canImport(GooglePlaces)
  private let sessionLock = NSLock()
  private var sessions: [String: GMSAutocompleteSessionToken] = [:]
  #endif

  public func definition() -> ModuleDefinition {
    Name("VietRidePlaces")

    AsyncFunction("beginSession") { () -> String in
      #if canImport(GooglePlaces)
      return try self.beginSessionNative()
      #else
      throw PlacesException("UNAVAILABLE", "Google Places is unavailable in this build.")
      #endif
    }

    AsyncFunction("findPredictions") { (params: [String: Any]) -> [[String: String]] in
      #if canImport(GooglePlaces)
      return try await self.findPredictionsNative(params: params)
      #else
      throw PlacesException("UNAVAILABLE", "Google Places is unavailable in this build.")
      #endif
    }

    AsyncFunction("resolvePlace") { (params: [String: Any]) -> [String: Any] in
      #if canImport(GooglePlaces)
      return try await self.resolvePlaceNative(params: params)
      #else
      throw PlacesException("UNAVAILABLE", "Google Places is unavailable in this build.")
      #endif
    }

    AsyncFunction("endSession") { (sessionId: String) in
      #if canImport(GooglePlaces)
      self.endSessionNative(sessionId: sessionId)
      #endif
    }
  }

  #if canImport(GooglePlaces)
  private func beginSessionNative() throws -> String {
    let sessionId = UUID().uuidString
    let token = GMSAutocompleteSessionToken()
    sessionLock.lock()
    sessions[sessionId] = token
    sessionLock.unlock()
    return sessionId
  }

  private func endSessionNative(sessionId: String) {
    let normalized = sessionId.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !normalized.isEmpty else { return }
    sessionLock.lock()
    sessions.removeValue(forKey: normalized)
    sessionLock.unlock()
  }

  private func token(for sessionId: String) throws -> GMSAutocompleteSessionToken {
    let normalized = sessionId.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !normalized.isEmpty else {
      throw PlacesException("INVALID_SESSION", "A Places session is required.")
    }

    sessionLock.lock()
    let token = sessions[normalized]
    sessionLock.unlock()

    guard let token else {
      throw PlacesException("INVALID_SESSION", "Places session is not active.")
    }
    return token
  }

  private func findPredictionsNative(params: [String: Any]) async throws -> [[String: String]] {
    let sessionId = stringValue(params["sessionId"])
    let query = stringValue(params["query"]).trimmingCharacters(in: .whitespacesAndNewlines)
    if query.isEmpty {
      return []
    }

    let token = try token(for: sessionId)
    let maxResults = min(max(intValue(params["maxResults"]) ?? 5, 1), 5)
    let request = GMSAutocompleteRequest(query: query)
    request.sessionToken = token

    let filter = GMSAutocompleteFilter()
    let country = stringValue(params["countryCode"]).trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    if !country.isEmpty {
      filter.countries = [country]
    }

    if let latitude = doubleValue(params["latitude"]),
       let longitude = doubleValue(params["longitude"]) {
      let radius = max(min(doubleValue(params["radiusMeters"]) ?? 5_000, 50_000), 1)
      let center = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
      filter.locationBias = GMSPlaceCircularLocationOption(center, radius)
      filter.origin = CLLocation(latitude: latitude, longitude: longitude)
    }
    request.filter = filter

    return try await withCheckedThrowingContinuation { continuation in
      DispatchQueue.main.async {
        GMSPlacesClient.shared().fetchAutocompleteSuggestions(from: request) { results, error in
          if let error {
            continuation.resume(throwing: self.mapError(error))
            return
          }

          let payload: [[String: String]] = (results ?? []).prefix(maxResults).compactMap { suggestion in
            guard let placeSuggestion = suggestion.placeSuggestion else {
              return nil
            }
            return [
              "placeId": placeSuggestion.placeID,
              "primaryText": placeSuggestion.attributedPrimaryText?.string ?? placeSuggestion.attributedFullText.string,
              "secondaryText": placeSuggestion.attributedSecondaryText?.string ?? "",
              "fullText": placeSuggestion.attributedFullText.string,
            ]
          }
          continuation.resume(returning: payload)
        }
      }
    }
  }

  private func resolvePlaceNative(params: [String: Any]) async throws -> [String: Any] {
    let sessionId = stringValue(params["sessionId"])
    let placeId = stringValue(params["placeId"]).trimmingCharacters(in: .whitespacesAndNewlines)
    if placeId.isEmpty {
      throw PlacesException("INVALID_PLACE", "A place identifier is required.")
    }

    let token = try token(for: sessionId)
    let properties: [String] = [
      GMSPlaceProperty.placeID,
      GMSPlaceProperty.displayName,
      GMSPlaceProperty.formattedAddress,
      GMSPlaceProperty.coordinate,
    ].map(\.rawValue)

    let fetchRequest = GMSFetchPlaceRequest(
      placeID: placeId,
      placeProperties: properties,
      sessionToken: token
    )

    let place: GMSPlace = try await withCheckedThrowingContinuation { continuation in
      DispatchQueue.main.async {
        GMSPlacesClient.shared().fetchPlace(with: fetchRequest) { place, error in
          if let error {
            continuation.resume(throwing: self.mapError(error))
            return
          }
          guard let place else {
            continuation.resume(
              throwing: PlacesException("INVALID_PLACE", "Place details are unavailable.")
            )
            return
          }
          continuation.resume(returning: place)
        }
      }
    }

    let displayName = (place.displayName?.trimmingCharacters(in: .whitespacesAndNewlines)).flatMap {
      $0.isEmpty ? nil : $0
    } ?? (place.formattedAddress?.trimmingCharacters(in: .whitespacesAndNewlines)).flatMap {
      $0.isEmpty ? nil : $0
    }

    let formattedAddress = (place.formattedAddress?.trimmingCharacters(in: .whitespacesAndNewlines)).flatMap {
      $0.isEmpty ? nil : $0
    } ?? displayName

    guard let displayName, let formattedAddress else {
      throw PlacesException("INVALID_PLACE", "Place address details are incomplete.")
    }

    let coordinate = place.coordinate
    guard CLLocationCoordinate2DIsValid(coordinate) else {
      throw PlacesException("INVALID_PLACE", "Place coordinates are unavailable.")
    }

    endSessionNative(sessionId: sessionId)

    return [
      "placeId": placeId,
      "displayName": displayName,
      "formattedAddress": formattedAddress,
      "latitude": coordinate.latitude,
      "longitude": coordinate.longitude,
    ]
  }

  private func mapError(_ error: Error) -> PlacesException {
    let nsError = error as NSError
    let message = nsError.localizedDescription
    let isPlacesError = nsError.domain == kGMSPlacesErrorDomain
    let configurationCodes: Set<Int> = [-4, -5, -9, -10]
    let quotaCodes: Set<Int> = [-6, -7, -8]

    if (isPlacesError && configurationCodes.contains(nsError.code))
      || message.localizedCaseInsensitiveContains("API key")
      || message.localizedCaseInsensitiveContains("not authorized")
      || message.localizedCaseInsensitiveContains("REQUEST_DENIED") {
      return PlacesException("CONFIGURATION", "Google Places is not configured for this build.")
    }
    if (isPlacesError && quotaCodes.contains(nsError.code))
      || message.localizedCaseInsensitiveContains("OVER_QUERY_LIMIT")
      || message.localizedCaseInsensitiveContains("quota")
      || message.localizedCaseInsensitiveContains("rate limit") {
      return PlacesException("QUOTA", "Places quota has been exceeded.")
    }
    if (isPlacesError && nsError.code == -1)
      || message.localizedCaseInsensitiveContains("network")
      || message.localizedCaseInsensitiveContains("offline")
      || message.localizedCaseInsensitiveContains("Internet")
      || nsError.domain == NSURLErrorDomain {
      return PlacesException("OFFLINE", "Places requires a network connection.")
    }
    return PlacesException("UNAVAILABLE", "Places request failed.")
  }

  private func stringValue(_ value: Any?) -> String {
    if let value = value as? String {
      return value
    }
    if let value = value as? NSString {
      return value as String
    }
    return ""
  }

  private func doubleValue(_ value: Any?) -> Double? {
    if let value = value as? Double {
      return value
    }
    if let value = value as? NSNumber {
      return value.doubleValue
    }
    return nil
  }

  private func intValue(_ value: Any?) -> Int? {
    if let value = value as? Int {
      return value
    }
    if let value = value as? NSNumber {
      return value.intValue
    }
    return nil
  }
  #endif
}

private final class PlacesException: Exception {
  private let codeValue: String
  private let messageValue: String

  init(_ code: String, _ message: String) {
    self.codeValue = code
    self.messageValue = message
    super.init()
  }

  override var code: String {
    codeValue
  }

  override var reason: String {
    messageValue
  }
}
