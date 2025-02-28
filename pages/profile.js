import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { theme } from '../styles/theme';
import Link from 'next/link';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [aboutMe, setAboutMe] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    if (typeof window !== 'undefined') {
      handleResize();
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        try {
          const profileDoc = await getDoc(doc(db, 'userProfiles', user.uid));
          if (profileDoc.exists()) {
            const profileData = profileDoc.data();
            setUserProfile(profileData);
            setAboutMe(profileData.aboutMe || '');
          } else {
            router.push('/profile-setup');
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      } else {
        router.push('/signin');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleSaveAboutMe = async () => {
    if (!user) return;
    
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const userProfileRef = doc(db, 'userProfiles', user.uid);
      await updateDoc(userProfileRef, {
        aboutMe: aboutMe,
        updatedAt: new Date().toISOString()
      });
      
      setSaveMessage('Profile updated successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setSaveMessage('Error updating profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: theme.colors.bgPrimary,
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
      }}>
        <LoadingSpinner size={40} />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: theme.colors.bgPrimary,
      color: theme.colors.textPrimary,
      fontFamily: "Inter, system-ui, sans-serif"
    }}>
      {/* Navigation */}
      <nav style={{
        background: theme.colors.bgSecondary,
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        padding: isMobile ? "1rem" : "1.2rem 2rem",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50
      }}>
        <div style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: isMobile ? "0 1rem" : 0
        }}>
          <Link href="/dashboard" style={{
            fontSize: "1.5rem",
            fontWeight: "700",
            background: theme.colors.gradientPrimary,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textDecoration: "none"
          }}>
            VladaHealth
          </Link>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "1.5rem"
          }}>
            <button
              onClick={() => auth.signOut()}
              style={{
                padding: "0.75rem 1.5rem",
                background: "transparent",
                border: `1px solid ${theme.colors.primary}`,
                borderRadius: theme.borderRadius.md,
                color: theme.colors.primary,
                cursor: "pointer",
                fontSize: "0.9rem",
                fontWeight: "600",
                transition: "all 0.3s ease"
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: isMobile ? "5rem 1rem 1rem" : "7rem 2rem 2rem",
      }}>
        <div style={{
          background: theme.colors.bgSecondary,
          borderRadius: theme.borderRadius.lg,
          padding: "2rem",
          border: "1px solid rgba(255, 255, 255, 0.1)"
        }}>
          <h1 style={{
            fontSize: "1.8rem",
            fontWeight: "700",
            marginBottom: "2rem",
            background: theme.colors.gradientPrimary,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>Your Profile</h1>

          {userProfile && (
            <div style={{
              display: "grid",
              gap: "2rem"
            }}>
              {/* User Info */}
              <div>
                <h2 style={{
                  fontSize: "1.2rem",
                  fontWeight: "600",
                  marginBottom: "1rem",
                  color: theme.colors.textPrimary
                }}>Account Information</h2>
                <div style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  padding: "1.5rem",
                  borderRadius: theme.borderRadius.md
                }}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                    gap: "1.5rem"
                  }}>
                    <div>
                      <p style={{ color: theme.colors.textSecondary, marginBottom: "0.5rem" }}>Email</p>
                      <p>{user.email}</p>
                    </div>
                    <div>
                      <p style={{ color: theme.colors.textSecondary, marginBottom: "0.5rem" }}>Account Created</p>
                      <p>{new Date(user.metadata.creationTime).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <h2 style={{
                  fontSize: "1.2rem",
                  fontWeight: "600",
                  marginBottom: "1rem",
                  color: theme.colors.textPrimary
                }}>Location</h2>
                <div style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  padding: "1.5rem",
                  borderRadius: theme.borderRadius.md
                }}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                    gap: "1.5rem"
                  }}>
                    <div>
                      <p style={{ color: theme.colors.textSecondary, marginBottom: "0.5rem" }}>State</p>
                      <p>{userProfile.location.state}</p>
                    </div>
                    <div>
                      <p style={{ color: theme.colors.textSecondary, marginBottom: "0.5rem" }}>ZIP Code</p>
                      <p>{userProfile.location.zipCode}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Insurance */}
              <div>
                <h2 style={{
                  fontSize: "1.2rem",
                  fontWeight: "600",
                  marginBottom: "1rem",
                  color: theme.colors.textPrimary
                }}>Insurance</h2>
                <div style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  padding: "1.5rem",
                  borderRadius: theme.borderRadius.md
                }}>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                    gap: "1.5rem"
                  }}>
                    <div>
                      <p style={{ color: theme.colors.textSecondary, marginBottom: "0.5rem" }}>Type</p>
                      <p>{userProfile.insurance.type}</p>
                    </div>
                    <div>
                      <p style={{ color: theme.colors.textSecondary, marginBottom: "0.5rem" }}>Provider</p>
                      <p>{userProfile.insurance.provider}</p>
                    </div>
                    {userProfile.insurance.planType && (
                      <div>
                        <p style={{ color: theme.colors.textSecondary, marginBottom: "0.5rem" }}>Plan Type</p>
                        <p>{userProfile.insurance.planType}</p>
                      </div>
                    )}
                    {userProfile.insurance.hasSecondaryInsurance && (
                      <div>
                        <p style={{ color: theme.colors.textSecondary, marginBottom: "0.5rem" }}>Secondary Provider</p>
                        <p>{userProfile.insurance.secondaryProvider}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* About Me */}
              <div>
                <h2 style={{
                  fontSize: "1.2rem",
                  fontWeight: "600",
                  marginBottom: "1rem",
                  color: theme.colors.textPrimary
                }}>About Me</h2>
                <div style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  padding: "1.5rem",
                  borderRadius: theme.borderRadius.md
                }}>
                  <textarea
                    value={aboutMe}
                    onChange={(e) => setAboutMe(e.target.value)}
                    placeholder="Tell us more about yourself..."
                    style={{
                      width: "100%",
                      minHeight: "120px",
                      padding: "1rem",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: theme.borderRadius.md,
                      color: theme.colors.textPrimary,
                      resize: "vertical",
                      fontFamily: "inherit",
                      fontSize: "1rem",
                      marginBottom: "1rem"
                    }}
                  />
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <button
                      onClick={handleSaveAboutMe}
                      disabled={isSaving}
                      style={{
                        padding: "0.75rem 1.5rem",
                        background: theme.colors.gradientPrimary,
                        border: "none",
                        borderRadius: theme.borderRadius.md,
                        color: theme.colors.textPrimary,
                        cursor: isSaving ? "not-allowed" : "pointer",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                        opacity: isSaving ? 0.7 : 1,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem"
                      }}
                    >
                      {isSaving ? (
                        <>
                          <LoadingSpinner size={16} />
                          <span>Saving...</span>
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </button>
                    {saveMessage && (
                      <span style={{
                        color: saveMessage.includes('Error') ? theme.colors.accent : theme.colors.primary,
                        fontSize: "0.9rem"
                      }}>
                        {saveMessage}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Edit Profile Button */}
              <div style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "1rem"
              }}>
                <Link href="/profile-setup" style={{
                  padding: "0.75rem 1.5rem",
                  background: "transparent",
                  border: `1px solid ${theme.colors.primary}`,
                  borderRadius: theme.borderRadius.md,
                  color: theme.colors.primary,
                  textDecoration: "none",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  display: "inline-block"
                }}>
                  Edit Profile Details
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 