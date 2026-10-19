import SwiftUI

struct ProfileScreen: View {
    @Bindable var store: AppStore
    @Bindable var session: AppSession
    @State private var name = ""
    @State private var preferences = Preferences()
    @State private var showPassword = false
    @State private var showDelete = false
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var savedMessage: String?

    var body: some View {
        Form {
            Section("Profile") {
                TextField("Display name", text: $name).textContentType(.name)
                LabeledContent("Email", value: store.profile?.email ?? store.user.email)
            }
            Section("Appearance") {
                Picker("Theme", selection: $preferences.theme) {
                    ForEach(ThemePreference.allCases, id: \.self) { Text($0.rawValue.capitalized).tag($0) }
                }
                Toggle("Reduce motion", isOn: $preferences.reducedMotion)
            }
            Section("Privacy") {
                Toggle("Remove photo location metadata", isOn: $preferences.removePhotoGPS)
                Toggle("Anonymous performance analytics", isOn: $preferences.analyticsConsent)
                Label("Private images use short-lived links and are never placed in a public bucket.", systemImage: "lock.shield")
                    .font(.footnote).foregroundStyle(.secondary)
            }
            Section {
                Button(isSaving ? "Saving…" : "Save profile and preferences") { Task { await save() } }.disabled(isSaving)
                if let savedMessage { Text(savedMessage).font(.footnote).foregroundStyle(.green) }
            }
            Section("Security") {
                Button("Change password", systemImage: "key") { showPassword = true }
                Button("Sign out", systemImage: "rectangle.portrait.and.arrow.right") { Task { await session.signOut() } }
                Button("Delete account", systemImage: "trash", role: .destructive) { showDelete = true }
            }
            Section("About") {
                LabeledContent("Trips", value: "\(store.trips.count)")
                LabeledContent("Countries visited", value: "\(store.visitedCountryCodes.count) of 195")
                LabeledContent("Memories", value: "\(store.memories.count)")
                Link("World map attribution (CC BY 4.0)", destination: URL(string: "https://github.com/VictorCazanave/svg-maps/tree/master/packages/world")!)
            }
        }
        .navigationTitle("Profile")
        .task { name = store.profile?.displayName ?? ""; preferences = store.preferences }
        .sheet(isPresented: $showPassword) { PasswordChangeView(session: session) }
        .sheet(isPresented: $showDelete) { DeleteAccountView(store: store, session: session) }
        .alert("Profile error", isPresented: Binding(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })) { Button("OK", role: .cancel) {} } message: { Text(errorMessage ?? "") }
    }

    private func save() async {
        isSaving = true
        savedMessage = nil
        defer { isSaving = false }
        do {
            try await store.saveProfile(name: name)
            try await store.savePreferences(preferences)
            savedMessage = "Saved"
        } catch { errorMessage = AppSession.safeMessage(error) }
    }
}

private struct DeleteAccountView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var store: AppStore
    @Bindable var session: AppSession
    @State private var confirmation = ""
    @State private var isDeleting = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Label("This permanently removes your trips, memories, private files, and account.", systemImage: "exclamationmark.triangle.fill").foregroundStyle(.red)
                }
                Section("Type DELETE to confirm") {
                    TextField("DELETE", text: $confirmation).textInputAutocapitalization(.characters).autocorrectionDisabled()
                }
                if let errorMessage { Section { Text(errorMessage).foregroundStyle(.red) } }
                Section {
                    Button(isDeleting ? "Deleting…" : "Delete my account", role: .destructive) { Task { await removeAccount() } }
                        .disabled(confirmation != "DELETE" || isDeleting).accessibilityIdentifier("delete-account-button")
                }
            }
            .navigationTitle("Delete account")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
        }
    }

    private func removeAccount() async {
        isDeleting = true
        defer { isDeleting = false }
        do {
            try await store.services.profile.deleteAccount(confirmation: confirmation)
            await store.services.cache.clear(userId: store.user.id)
            dismiss()
        } catch {
            errorMessage = AppSession.safeMessage(error) + " If requested, sign out and sign in again before retrying."
        }
    }
}

