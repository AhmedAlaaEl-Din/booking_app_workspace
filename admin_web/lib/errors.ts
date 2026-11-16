// Turns Firebase error codes into messages a person can act on.

export function friendlyError(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Wrong email or password.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/network-request-failed":
    case "unavailable":
      return "No connection. Check your internet and try again.";
    case "permission-denied":
      return "You do not have permission to do that. Are the latest Firestore rules deployed?";
    case "not-found":
      return "This item no longer exists.";
    default:
      return "Something went wrong. Please try again.";
  }
}
