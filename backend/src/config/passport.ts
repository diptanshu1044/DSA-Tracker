import passport from "passport";
import {
  Strategy as GoogleStrategy,
  type Profile,
  type VerifyCallback,
} from "passport-google-oauth20";
import { env } from "./env.js";

export interface GoogleProfileUser {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
  provider: "google";
}

export function configurePassport(): void {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    console.warn(
      "Google OAuth credentials not configured — Google login disabled",
    );
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      (
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: VerifyCallback,
      ) => {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          done(new Error("Google account has no email"));
          return;
        }

        const user: GoogleProfileUser = {
          googleId: profile.id,
          email,
          name: profile.displayName || email.split("@")[0] || "User",
          avatar: profile.photos?.[0]?.value,
          provider: "google",
        };

        done(null, user as unknown as Express.User);
      },
    ),
  );
}
