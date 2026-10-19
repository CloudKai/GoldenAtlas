import SwiftUI

struct AuthView: View {
    enum Mode: String, CaseIterable { case signIn = "Sign in", signUp = "Create account" }
    @Bindable var session: AppSession
    @State private var mode: Mode = .signIn
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var showReset = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                Spacer(minLength: 48)
                Image(systemName: "globe.americas.fill").font(.system(size: 58)).foregroundStyle(GAColor.gold)
                    .accessibilityHidden(true)
                Text("Golden Atlas").font(.largeTitle.bold())
                Text("A private place for the journeys you want to remember.")
                    .font(.title3).foregroundStyle(.secondary)

                Picker("Account action", selection: $mode) {
                    ForEach(Mode.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                }.pickerStyle(.segmented)

                VStack(spacing: 14) {
                    if mode == .signUp {
                        TextField("Your name", text: $name).textContentType(.name)
                            .textFieldStyle(.roundedBorder).accessibilityIdentifier("name-field")
                    }
                    TextField("Email", text: $email).textContentType(.emailAddress)
                        .textInputAutocapitalization(.never).keyboardType(.emailAddress).autocorrectionDisabled()
                        .textFieldStyle(.roundedBorder).accessibilityIdentifier("email-field")
                    SecureField("Password", text: $password).textContentType(mode == .signUp ? .newPassword : .password)
                        .textFieldStyle(.roundedBorder).accessibilityIdentifier("password-field")
                    if mode == .signUp {
                        Text("At least 10 characters with letters and numbers.").font(.caption).foregroundStyle(.secondary).frame(maxWidth: .infinity, alignment: .leading)
                    }
                }

                Button {
                    Task {
                        if mode == .signIn { await session.signIn(email: email, password: password) }
                        else { await session.signUp(email: email, password: password, displayName: name) }
                    }
                } label: {
                    Group { if session.isWorking { ProgressView() } else { Text(mode.rawValue) } }
                }
                .buttonStyle(PrimaryButtonStyle()).disabled(session.isWorking || email.isEmpty || password.isEmpty)
                .accessibilityIdentifier(mode == .signIn ? "sign-in-button" : "sign-up-button")

                if mode == .signIn {
                    Button("Forgot password?") { showReset = true }.frame(maxWidth: .infinity)
                }
                Text("Your trips and photographs are private and protected by your account.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
            .padding(28)
        }
        .sheet(isPresented: $showReset) { PasswordResetView(session: session) }
    }
}

struct VerificationView: View {
    let email: String
    let returnToSignIn: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "envelope.badge.shield.half.filled").font(.system(size: 54)).foregroundStyle(GAColor.gold)
            Text("Check your inbox").font(.largeTitle.bold())
            Text("We sent a verification link to \(email). Open it on this iPhone to continue.")
                .multilineTextAlignment(.center).foregroundStyle(.secondary)
            Button("Return to sign in", action: returnToSignIn).buttonStyle(PrimaryButtonStyle())
        }.padding(28)
    }
}

struct PasswordResetView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var session: AppSession
    @State private var email = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Account email") {
                    TextField("Email", text: $email).textContentType(.emailAddress).keyboardType(.emailAddress).textInputAutocapitalization(.never)
                }
                Button("Send reset link") { Task { await session.resetPassword(email: email); dismiss() } }
                    .disabled(email.isEmpty || session.isWorking)
            }
            .navigationTitle("Reset password")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
        }
    }
}

struct PasswordChangeView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var session: AppSession
    @State private var password = ""
    @State private var confirmation = ""
    @State private var localError: String?

    var body: some View {
        NavigationStack {
            Form {
                SecureField("New password", text: $password).textContentType(.newPassword)
                SecureField("Confirm password", text: $confirmation).textContentType(.newPassword)
                if let localError { Text(localError).foregroundStyle(.red) }
                Button("Update password") {
                    guard password == confirmation else { localError = "Passwords do not match."; return }
                    Task {
                        do { try await session.services?.auth.updatePassword(password); dismiss() }
                        catch { localError = AppSession.safeMessage(error) }
                    }
                }.disabled(password.isEmpty)
            }
            .navigationTitle("Choose a new password")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
        }
    }
}

