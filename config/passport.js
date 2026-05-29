import 'dotenv/config';
import passport from 'passport';
import { Strategy as DiscordStrategy, Scope } from 'passport-discord-auth';

passport.use(
  new DiscordStrategy(
    {
      "clientId": process.env.DISCORD_CLIENT_ID,
      "clientSecret": process.env.DISCORD_CLIENT_SECRET,
      "callbackUrl": process.env.DISCORD_CALLBACK_URL,
      "scope": [Scope.Identify],
    },
    (accessToken, refreshToken, profile, done) => {
      if (profile.id !== process.env.ADMIN_DISCORD_ID) {
        return done(null, false);
      }
      return done(null, { id: profile.id, username: profile.username });
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => done(null, { id }));

export default passport;
