import XCTest

final class GoldenAtlasUITests: XCTestCase {
    private func configuredApp() -> XCUIApplication {
        let app = XCUIApplication()
        app.launchEnvironment["SUPABASE_URL"] = "http://127.0.0.1:54321"
        app.launchEnvironment["SUPABASE_PUBLISHABLE_KEY"] = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
        app.launchEnvironment["GOLDEN_ATLAS_CONFIGURATION"] = "Local"
        return app
    }

    func testAuthenticationScreenIsAccessible() {
        let app = configuredApp()
        app.launch()
        XCTAssertTrue(app.textFields["email-field"].waitForExistence(timeout: 8))
        XCTAssertTrue(app.secureTextFields["password-field"].exists)
        XCTAssertTrue(app.buttons["sign-in-button"].exists)
    }

    func testSignedInTripAndMemoryFlow() throws {
        guard ProcessInfo.processInfo.environment["GOLDEN_ATLAS_E2E"] == "1" else {
            throw XCTSkip("Set GOLDEN_ATLAS_E2E=1 with a seeded local test account and photo fixture.")
        }
        let app = configuredApp()
        app.launchEnvironment["GOLDEN_ATLAS_E2E_EMAIL"] = ProcessInfo.processInfo.environment["GOLDEN_ATLAS_E2E_EMAIL"] ?? ""
        app.launchEnvironment["GOLDEN_ATLAS_E2E_PASSWORD"] = ProcessInfo.processInfo.environment["GOLDEN_ATLAS_E2E_PASSWORD"] ?? ""
        app.launch()
        let email = app.launchEnvironment["GOLDEN_ATLAS_E2E_EMAIL"] ?? ""
        let password = app.launchEnvironment["GOLDEN_ATLAS_E2E_PASSWORD"] ?? ""
        app.textFields["email-field"].tap(); app.textFields["email-field"].typeText(email)
        app.secureTextFields["password-field"].tap(); app.secureTextFields["password-field"].typeText(password)
        app.buttons["sign-in-button"].tap()
        XCTAssertTrue(app.buttons["trips-tab"].waitForExistence(timeout: 10))
        app.buttons["trips-tab"].tap()
        app.navigationBars["Trips"].buttons["Add trip"].tap()
        XCTAssertTrue(app.textFields["trip-name-field"].waitForExistence(timeout: 4))
    }

    func testDeepLinksAndDestructiveFlowsRequireBackendFixture() throws {
        throw XCTSkip("Covered by the hosted staging suite: recovery deep link, interrupted upload retry, memory/trip deletion, cached relaunch, sign-out, and recent-auth account deletion.")
    }
}
