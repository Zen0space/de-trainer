# Requirements Document

## Introduction

This feature implements a secure OAuth authentication flow between the JejakAthlete mobile application and web application within the monorepo. The flow enables users to authenticate via the web interface and automatically return to the mobile app with valid session credentials.

## Glossary

- **Mobile App**: The React Native Expo application running on iOS/Android devices
- **Web App**: The Next.js web application hosted at jejak-athlete.vercel.app
- **OAuth Flow**: The authentication process where users authenticate via web and return to mobile
- **Deep Link**: A URL scheme that opens the mobile app (jejakathlete://)
- **Universal Link**: An HTTPS URL that can open the mobile app on iOS (https://jejak-athlete.vercel.app)
- **Session Tokens**: Access token and refresh token provided by Supabase authentication
- **Redirect URI**: The URL where the user is sent after authentication
- **Auth Callback**: The endpoint that handles the OAuth response and redirects back to mobile

## Requirements

### Requirement 1

**User Story:** As a mobile app user, I want to authenticate using the web interface, so that I can securely log in and be automatically returned to the mobile app.

#### Acceptance Criteria

1. WHEN a user taps the login button in the mobile app THEN the system SHALL open the web authentication page in a secure browser session
2. WHEN the web authentication page loads THEN the system SHALL include the mobile redirect URI as a query parameter
3. WHEN a user successfully authenticates on the web THEN the system SHALL redirect back to the mobile app with valid session tokens
4. WHEN the mobile app receives the callback THEN the system SHALL extract the access token and refresh token from the URL
5. WHEN the mobile app receives valid tokens THEN the system SHALL establish a Supabase session and load the user profile

### Requirement 2

**User Story:** As a mobile app user, I want authentication errors to be handled gracefully, so that I understand what went wrong and can retry.

#### Acceptance Criteria

1. WHEN authentication fails on the web THEN the system SHALL redirect to the mobile app with error information
2. WHEN the mobile app receives an error callback THEN the system SHALL display a user-friendly error message
3. WHEN a user cancels the authentication browser THEN the system SHALL return to the mobile app without showing an error
4. IF network connectivity is lost during authentication THEN the system SHALL handle the timeout gracefully
5. WHEN an invalid or expired code is received THEN the system SHALL reject the session and display an appropriate error

### Requirement 3

**User Story:** As a developer, I want the web callback endpoint to handle both web and mobile redirects, so that the same authentication flow works for both platforms.

#### Acceptance Criteria

1. WHEN the callback endpoint receives a redirect_to parameter THEN the system SHALL redirect to that URL after successful authentication
2. WHEN the callback endpoint receives no redirect_to parameter THEN the system SHALL redirect to the web success page
3. WHEN exchanging the authorization code for a session THEN the system SHALL include the access token and refresh token in the mobile redirect URL
4. WHEN an error occurs during code exchange THEN the system SHALL include error details in the redirect URL
5. WHEN redirecting to mobile THEN the system SHALL use URL-encoded query parameters for all token and error data

### Requirement 4

**User Story:** As a mobile app user, I want the app to handle deep links properly, so that I am automatically logged in when returning from the browser.

#### Acceptance Criteria

1. WHEN the mobile app is opened via a deep link THEN the system SHALL check for authentication tokens in the URL
2. WHEN authentication tokens are present in the deep link THEN the system SHALL call setSession with those tokens
3. WHEN the session is successfully set THEN the system SHALL fetch and load the user profile
4. WHEN the app is already running and receives a deep link THEN the system SHALL process the authentication without restarting
5. WHEN the app is closed and opened via deep link THEN the system SHALL process the authentication on initial load

### Requirement 5

**User Story:** As a developer, I want proper deep link configuration for both iOS and Android, so that the OAuth callback works reliably on both platforms.

#### Acceptance Criteria

1. WHEN configuring iOS THEN the system SHALL register the custom URL scheme "jejakathlete"
2. WHEN configuring iOS THEN the system SHALL register the universal link domain "jejak-athlete.vercel.app"
3. WHEN configuring Android THEN the system SHALL register intent filters for both the custom scheme and HTTPS domain
4. WHEN configuring Android THEN the system SHALL set autoVerify to true for universal links
5. WHEN the web app redirects THEN the system SHALL use the correct URL format that triggers the mobile app

### Requirement 6

**User Story:** As a mobile app user, I want to register a new account via the web interface, so that I can create an account and be automatically logged into the mobile app.

#### Acceptance Criteria

1. WHEN a user taps the sign up button in the mobile app THEN the system SHALL open the web registration page in a secure browser
2. WHEN the web registration page loads THEN the system SHALL include the mobile redirect URI as a query parameter
3. WHEN a user successfully registers on the web THEN the system SHALL redirect back to the mobile app with valid session tokens
4. WHEN the mobile app receives the registration callback THEN the system SHALL establish a session and load the new user profile
5. WHEN registration requires email verification THEN the system SHALL handle the pending verification state appropriately

### Requirement 7

**User Story:** As a developer, I want comprehensive logging throughout the OAuth flow, so that I can debug issues and monitor the authentication process.

#### Acceptance Criteria

1. WHEN the mobile app initiates authentication THEN the system SHALL log the redirect URI being used
2. WHEN the web callback receives a request THEN the system SHALL log the authorization code and redirect_to parameter
3. WHEN exchanging the code for a session THEN the system SHALL log success or failure with error details
4. WHEN the mobile app receives a callback THEN the system SHALL log whether tokens were found and session establishment status
5. WHEN any error occurs THEN the system SHALL log the error with sufficient context for debugging
