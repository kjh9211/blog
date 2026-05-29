import passport from 'passport';
import { Strategy as DiscordStrategy, Scope } from 'passport-discord-auth';
import { Strategy as LocalStrategy } from 'passport-local';

// Discord OAuth2 (실제 관리자)
passport.use(
  new DiscordStrategy(
    {
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      callbackUrl: process.env.DISCORD_CALLBACK_URL,
      scope: [Scope.Identify],
    },
    (accessToken, refreshToken, profile, done) => {
      if (profile.id !== process.env.ADMIN_DISCORD_ID) {
        return done(null, false);
      }
      return done(null, { id: profile.id, username: profile.username, isTest: false });
    }
  )
);

// Local 로그인 (테스트 더미 계정)
passport.use(
  new LocalStrategy(
    { usernameField: 'username', passwordField: 'password' },
    (username, password, done) => {
      const validUser = process.env.TEST_USERNAME;
      const validPass = process.env.TEST_PASSWORD;

      if (!validUser || !validPass) {
        return done(null, false, { message: '테스트 계정이 설정되지 않았습니다.' });
      }
      if (username === validUser && password === validPass) {
        return done(null, { id: 'test', username, isTest: true });
      }
      return done(null, false, { message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }
  )
);

// 세션에 전체 사용자 객체 저장 (isTest 플래그 보존)
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((data, done) => {
  // 구버전 세션 호환 (Discord ID 문자열이 저장된 경우)
  if (typeof data !== 'object') return done(null, { id: data, isTest: false });
  done(null, data);
});

export default passport;
