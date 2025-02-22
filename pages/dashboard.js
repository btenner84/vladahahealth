import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { auth } from '../firebase';
import { theme } from '../styles/theme';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        // Fetch user profile
        try {
          const profileDoc = await getDoc(doc(db, 'userProfiles', user.uid));
          if (profileDoc.exists()) {
            setUserProfile(profileDoc.data());
          } else {
            // Redirect to profile setup if no profile exists
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

  const ProfileSection = () => (
    <div style={{
      background: theme.colors.bgSecondary,
      borderRadius: theme.borderRadius.lg,
      padding: "2rem",
      marginBottom: "2rem",
      border: "1px solid rgba(255, 255, 255, 0.1)"
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "1.5rem"
      }}>
        <h2 style={{
          fontSize: "1.8rem",
          fontWeight: "700",
          background: theme.colors.gradientSecondary,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>Your Profile</h2>
        <Link href="/profile-setup" style={{
          padding: "0.75rem 1.5rem",
          background: "transparent",
          border: `1px solid ${theme.colors.primary}`,
          borderRadius: theme.borderRadius.md,
          color: theme.colors.primary,
          textDecoration: "none"
        }}>
          Edit Profile
        </Link>
      </div>

      {userProfile ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "2rem"
        }}>
          <div>
            <h3 style={{color: theme.colors.textSecondary}}>Location</h3>
            <p>{userProfile.location.state}</p>
            <p>{userProfile.location.zipCode}</p>
          </div>
          <div>
            <h3 style={{color: theme.colors.textSecondary}}>Insurance</h3>
            <p>Type: {userProfile.insurance.type}</p>
            <p>Provider: {userProfile.insurance.provider}</p>
            {userProfile.insurance.planType && (
              <p>Plan Type: {userProfile.insurance.planType}</p>
            )}
            {userProfile.insurance.hasSecondaryInsurance && (
              <p>Secondary: {userProfile.insurance.secondaryProvider}</p>
            )}
          </div>
        </div>
      ) : (
        <div style={{textAlign: "center", color: theme.colors.textSecondary}}>
          Please complete your profile to get started
        </div>
      )}
    </div>
  );

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
        padding: "1.2rem 2rem",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50
      }}>
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <Link href="/" style={{
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
            gap: "2rem"
          }}>
            {user && (
              <div style={{
                color: theme.colors.textSecondary
              }}>
                {user.email}
              </div>
            )}
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
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "7rem 2rem 2rem",
      }}>
        <ProfileSection />
        {/* Welcome Section */}
        <div style={{
          background: `linear-gradient(135deg, ${theme.colors.bgSecondary} 0%, rgba(30, 41, 59, 0.5) 100%)`,
          borderRadius: theme.borderRadius.lg,
          padding: "2rem",
          marginBottom: "2rem",
          border: "1px solid rgba(255, 255, 255, 0.1)"
        }}>
          <h1 style={{
            fontSize: "2.5rem",
            fontWeight: "800",
            marginBottom: "1rem",
            background: theme.colors.gradientPrimary,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>Your Healthcare Control Center</h1>
          <p style={{
            color: theme.colors.textSecondary,
            fontSize: "1.1rem",
            maxWidth: "600px"
          }}>Upload your medical bills, analyze costs, and generate dispute letters all in one place.</p>
        </div>

        {/* Actions Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "2rem",
          marginBottom: "3rem"
        }}>
          {[
            {
              title: "Upload Bills",
              description: "Securely upload your medical bills for AI analysis",
              icon: "📄",
              action: "Upload Now"
            },
            {
              title: "Cost Analysis",
              description: "Get detailed cost comparisons and identify overcharges",
              icon: "📊",
              action: "Analyze Costs"
            },
            {
              title: "Generate Disputes",
              description: "Create professional dispute letters backed by data",
              icon: "⚡",
              action: "Create Letter"
            }
          ].map((item, index) => (
            <div key={index} style={{
              background: theme.colors.bgSecondary,
              borderRadius: theme.borderRadius.lg,
              padding: "2rem",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
              ":hover": {
                transform: "translateY(-5px)",
                boxShadow: theme.shadows.hover
              }
            }}>
              <div style={{
                fontSize: "3rem",
                marginBottom: "1rem"
              }}>{item.icon}</div>
              <h3 style={{
                fontSize: "1.5rem",
                fontWeight: "700",
                marginBottom: "1rem",
                background: theme.colors.gradientSecondary,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}>{item.title}</h3>
              <p style={{
                color: theme.colors.textSecondary,
                marginBottom: "2rem",
                lineHeight: "1.6"
              }}>{item.description}</p>
              <button style={{
                width: "100%",
                padding: "1rem",
                background: theme.colors.gradientPrimary,
                border: "none",
                borderRadius: theme.borderRadius.md,
                color: theme.colors.textPrimary,
                fontSize: "1rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}>
                {item.action}
              </button>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div style={{
          background: theme.colors.bgSecondary,
          borderRadius: theme.borderRadius.lg,
          padding: "2rem",
          border: "1px solid rgba(255, 255, 255, 0.1)"
        }}>
          <h2 style={{
            fontSize: "1.8rem",
            fontWeight: "700",
            marginBottom: "2rem",
            background: theme.colors.gradientSecondary,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>Your Impact</h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "2rem"
          }}>
            {[
              { label: "Bills Analyzed", value: "0" },
              { label: "Potential Savings", value: "$0" },
              { label: "Disputes Generated", value: "0" }
            ].map((stat, index) => (
              <div key={index} style={{
                textAlign: "center"
              }}>
                <div style={{
                  fontSize: "2.5rem",
                  fontWeight: "800",
                  marginBottom: "0.5rem",
                  background: theme.colors.gradientPrimary,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}>{stat.value}</div>
                <div style={{
                  color: theme.colors.textSecondary
                }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
} 