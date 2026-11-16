# Google & Apple sign-in setup

The app side is complete. Two things must be enabled in Nhost before the buttons can work:

1. Add `trinity://oauth` to **Nhost → Auth → Settings → Allowed redirect URLs**.
2. Enable the Google and Apple providers with real credentials.

The auth service currently reports both providers as `disabled-endpoint`, so the buttons will show “not enabled for this project yet” until this is done.

Project: `rgbqzglhvswpuwotofrr` (`eu-central-1`)

## Nhost redirect

```
trinity://oauth
```

The permanent package is now `com.auxo.app`. The OAuth redirect still uses `trinity://oauth` because the Nhost allowlist rejects `auxo://oauth` until that URL is added in the Nhost dashboard. The native manifest also accepts `auxo://` as an alias. The app also has an `/oauth` route so Android can finish the exchange if the browser hands the link back to the app.

## Google

In **Google Cloud Console → APIs & Services → Credentials**, create an **OAuth client ID → Web application**:

- Authorised JavaScript origin:
  ```
  https://rgbqzglhvswpuwotofrr.auth.eu-central-1.nhost.run
  ```
- Authorised redirect URI:
  ```
  https://rgbqzglhvswpuwotofrr.auth.eu-central-1.nhost.run/v1/signin/provider/google/callback
  ```

Then in **Nhost → Auth → Providers → Google** enable the provider and paste that client ID and client secret.

## Apple

In **Apple Developer → Certificates, Identifiers & Profiles → Identifiers**, create/configure a **Services ID** with Sign in with Apple enabled.

- Return URL:
  ```
  https://rgbqzglhvswpuwotofrr.auth.eu-central-1.nhost.run/v1/signin/provider/apple/callback
  ```
- Domain/subdomain: `rgbqzglhvswpuwotofrr.auth.eu-central-1.nhost.run`

Then in **Nhost → Auth → Providers → Apple** enable the provider with the Services ID, Team ID, Key ID and the `.p8` private key.

## How the flow works

- Uses browser OAuth with PKCE (SHA-256 via `expo-crypto`) — no client secret in the app.
- Nhost redirects to `trinity://oauth?code=…`.
- The code is exchanged once (`tokenExchange`) and the Nhost SDK persists the session; the existing auth guard takes over (onboarding or tabs).
- Cancelling the browser sheet is silent; provider errors are shown on the sign-in/sign-up screen.

## Password reset

Add `trinity://reset` to the same allowlist, then the reset email can return straight to the app. Until then the auth provider falls back to the default Nhost reset page.

## Hiding Apple until it is ready

The Apple button is hidden by default. Set `EXPO_PUBLIC_APPLE_SIGNIN=1` in `mobile/.env` and rebuild after the Apple provider is enabled.
