import Foundation
import Capacitor
import CoreLocation

/**
 * True-north heading from CoreLocation.
 *
 * The web DeviceOrientationEvent gives us beta/gamma referenced to gravity, but
 * its alpha has an arbitrary zero point, and webkitCompassHeading is not
 * dependable inside a WKWebView. CLLocationManager supplies a real heading,
 * corrected for magnetic declination when location is authorized.
 *
 * headingOrientation is pinned to .portrait on purpose: it selects which device
 * axis the heading describes, and we always want the top of the device (its +y
 * axis), which is the axis the leaf-normal math is written against. That is
 * independent of how the UI happens to be rotated, so it must NOT track the
 * interface orientation.
 */
@objc(CompassPlugin)
public class CompassPlugin: CAPPlugin, CAPBridgedPlugin, CLLocationManagerDelegate {
    public let identifier = "CompassPlugin"
    public let jsName = "Compass"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]

    private let manager = CLLocationManager()

    override public func load() {
        manager.delegate = self
        manager.headingFilter = 0.5          // degrees of change before an update
        manager.headingOrientation = .portrait
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": CLLocationManager.headingAvailable()])
    }

    @objc func start(_ call: CAPPluginCall) {
        guard CLLocationManager.headingAvailable() else {
            call.reject("Heading is not available on this device")
            return
        }
        DispatchQueue.main.async {
            // trueHeading stays negative until location is authorized and a fix
            // exists; without it CoreLocation can only offer magneticHeading.
            self.manager.requestWhenInUseAuthorization()
            self.manager.startUpdatingLocation()
            self.manager.startUpdatingHeading()
            call.resolve()
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.manager.stopUpdatingHeading()
            self.manager.stopUpdatingLocation()
            call.resolve()
        }
    }

    public func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        // trueHeading is negative when it cannot be determined; fall back to the
        // magnetic reading and say so rather than emitting a bogus true bearing.
        let hasTrue = newHeading.trueHeading >= 0
        notifyListeners("heading", data: [
            "degrees": hasTrue ? newHeading.trueHeading : newHeading.magneticHeading,
            // negative accuracy means the reading is currently untrustworthy
            "accuracy": newHeading.headingAccuracy,
            "trueNorth": hasTrue
        ])
    }

    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        notifyListeners("headingError", data: ["message": error.localizedDescription])
    }

    public func locationManagerShouldDisplayHeadingCalibration(_ manager: CLLocationManager) -> Bool {
        // let iOS prompt for the figure-8 wave when the magnetometer needs it
        return true
    }
}
