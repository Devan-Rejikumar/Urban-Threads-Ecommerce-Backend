import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

const setupGoogleAuth = () => {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: process.env.GOOGLE_CALLBACK_URL,
                scope: ['profile', 'email'],
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    // Check for a valid email
                    if (!profile.emails || !profile.emails[0].value) {
                        return done(new Error('No email found in Google profile'), null);
                    }

                    const email = profile.emails[0].value;
                    const googleId = profile.id;

                    // Check for existing user
                    const existingUser = await User.findOne({
                        $or: [{ email }, { googleId }],
                    });

                    if (existingUser) {
                        // Update googleId if missing
                        if (!existingUser.googleId) {
                            existingUser.googleId = googleId;
                            await existingUser.save();
                        }
                        return done(null, existingUser);
                    }

                    // Create a new user
                    const newUser = await User.create({
                        googleId,
                        email,
                        name: profile.displayName || email.split('@')[0],
                        provider: 'google',
                        emailVerified: true,
                    });

                    return done(null, newUser);
                } catch (error) {
                    console.error('Google authentication error:', error.message, error.stack);
                    return done(error, null);
                }
            }
        )
    );

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            if (!user) return done(null, false);
            done(null, user);
        } catch (error) {
            console.error('Deserialize user error:', error.message, error.stack);
            done(error, null);
        }
    });
};

export default setupGoogleAuth;
