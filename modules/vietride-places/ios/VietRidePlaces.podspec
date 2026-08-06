require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'VietRidePlaces'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = 'VietRide'
  s.homepage       = 'https://vietride.online'
  s.platforms      = {
    :ios => '15.1'
  }
  s.source         = { git: 'https://github.com/vietride/passenger-app.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'GooglePlaces'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
