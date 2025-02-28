import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { auth } from '../firebase';
import { theme } from '../styles/theme';
import Link from 'next/link';
import { doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileName, setFileName] = useState('');
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [recentUploads, setRecentUploads] = useState([]);
  const [selectedBillForAnalysis, setSelectedBillForAnalysis] = useState('');
  const [selectedBillForDispute, setSelectedBillForDispute] = useState('');
  const [analyzedBills, setAnalyzedBills] = useState([]);
  const [analyzingBill, setAnalyzingBill] = useState(false);
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [recentDisputes, setRecentDisputes] = useState([]);
  const [consentGiven, setConsentGiven] = useState(false);

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

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    if (typeof window !== 'undefined') {
      handleResize();
      window.addEventListener('resize', handleResize);
    }

    return () => {
      unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [router]);

  const UserAvatar = ({ email }) => (
    <Link href="/profile" style={{
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      background: theme.colors.gradientPrimary,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "1.2rem",
      fontWeight: "600",
      color: theme.colors.textPrimary,
      cursor: "pointer",
      textDecoration: "none"
    }}>
      {email ? email[0].toUpperCase() : 'U'}
    </Link>
  );

  const ProcessStep = ({ number, title, description }) => (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: "1rem",
      padding: "1rem"
    }}>
      <div style={{
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        background: theme.colors.gradientPrimary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1rem",
        fontWeight: "600",
        flexShrink: 0
      }}>
        {number}
      </div>
      <div>
        <h3 style={{
          fontSize: "1.1rem",
          fontWeight: "600",
          marginBottom: "0.5rem"
        }}>{title}</h3>
        <p style={{
          color: theme.colors.textSecondary,
          fontSize: "0.9rem",
          lineHeight: "1.4"
        }}>{description}</p>
      </div>
    </div>
  );

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

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    console.log('File selected:', file);
    if (file) {
      setSelectedFile(file);
      setFileName(file.name);
      setShowNameDialog(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !fileName) {
      console.error('No file or filename provided');
      return;
    }
    
    setUploadingFile(true);
    console.log('Starting upload process:', {
      fileName,
      fileSize: selectedFile.size,
      fileType: selectedFile.type,
      userId: user?.uid
    });

    try {
      // Create form data for the file upload
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('userId', user.uid);
      formData.append('fileName', fileName);
      
      console.log('Uploading file via proxy server...');
      
      // Update the fetch URL based on the environment
      const uploadUrl = process.env.NODE_ENV === 'production' 
        ? '/upload'  // This will be handled by Vercel routing
        : 'http://localhost:3001/upload';
      
      // Upload to our proxy server
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('File uploaded successfully:', data);
      
      // Continue with Firestore updates
      const billDocRef = await addDoc(collection(db, 'bills'), {
        userId: user.uid,
        fileName: fileName,
        originalName: selectedFile.name,
        fileUrl: data.downloadURL,
        uploadedAt: serverTimestamp(),
        status: 'pending_analysis',
        timestamp: data.timestamp,
        fileType: data.fileType,
        fileSize: data.fileSize
      });
      console.log('Saved to Firestore with ID:', billDocRef.id);

      // Update user profile
      const userProfileRef = doc(db, 'userProfiles', user.uid);
      await updateDoc(userProfileRef, {
        bills: arrayUnion({
          billId: billDocRef.id,
          fileName: fileName,
          uploadedAt: data.timestamp,
          status: 'pending_analysis'
        })
      });
      console.log('Updated user profile');

      // Update UI
      const newUpload = {
        id: billDocRef.id,
        fileName,
        uploadedAt: new Date().toLocaleString(),
        status: 'pending_analysis',
        fileUrl: data.downloadURL
      };

      setRecentUploads(prev => [newUpload, ...prev].slice(0, 5));
      console.log('Updated recent uploads');
      
      // Reset states
      setSelectedFile(null);
      setFileName('');
      setShowNameDialog(false);
      alert('File uploaded successfully!');

    } catch (error) {
      console.error('Upload error:', error);
      alert('Error uploading file: ' + error.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleAnalysis = async () => {
    if (!selectedBillForAnalysis) return;
    
    setAnalyzingBill(true);
    try {
      // Find the selected bill from recent uploads
      const billToAnalyze = recentUploads.find(
        upload => upload.fileName === selectedBillForAnalysis
      );

      // Simulate AI analysis (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Add to analyzed bills
      const analysisResult = {
        fileName: billToAnalyze.fileName,
        analyzedAt: new Date().toLocaleString(),
        findings: {
          potentialSavings: "$1,200",
          errorCount: 3,
          status: 'completed'
        }
      };

      setAnalyzedBills(prev => [analysisResult, ...prev]);
      setRecentAnalyses(prev => [analysisResult, ...prev]);
      
      // Reset selection
      setSelectedBillForAnalysis('');
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setAnalyzingBill(false);
    }
  };

  useEffect(() => {
    const fetchUploads = async () => {
      if (!user) return;

      try {
        const q = query(
          collection(db, 'bills'),
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc'),
          limit(5)
        );

        const querySnapshot = await getDocs(q);
        const uploads = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          uploadedAt: doc.data().uploadedAt?.toDate().toLocaleString() || new Date().toLocaleString()
        }));

        setRecentUploads(uploads);
      } catch (error) {
        console.error('Error fetching uploads:', error);
      }
    };

    fetchUploads();
  }, [user]);

  const testFirestore = async () => {
    try {
      const testDoc = doc(db, 'test', 'test');
      await setDoc(testDoc, { test: true });
      console.log('Firestore connection successful');
    } catch (error) {
      console.error('Firestore connection failed:', error);
    }
  };

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
            gap: "1.5rem"
          }}>
            <UserAvatar email={user?.email} />
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
        maxWidth: "1400px",
        margin: "0 auto",
        padding: isMobile ? "5rem 1rem 1rem" : "7rem 2rem 2rem",
      }}>
        {/* Process Steps */}
        <div style={{
          background: theme.colors.bgSecondary,
          borderRadius: theme.borderRadius.lg,
          padding: "2rem",
          marginBottom: "2rem",
          border: "1px solid rgba(255, 255, 255, 0.1)"
        }}>
          <h2 style={{
            fontSize: "1.8rem",
            fontWeight: "700",
            marginBottom: "2rem",
            background: theme.colors.gradientPrimary,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>How It Works</h2>
          
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: "2rem"
          }}>
            <ProcessStep 
              number="1"
              title="Upload Your Bills"
              description="Securely upload your medical bills in any format (PDF, images, or text)"
            />
            <ProcessStep 
              number="2"
              title="AI Analysis"
              description="Our AI analyzes charges, compares with fair market rates, and identifies potential errors"
            />
            <ProcessStep 
              number="3"
              title="Take Action"
              description="Generate customized dispute letters and track your savings"
            />
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
          gap: "2rem"
        }}>
          {/* Left Panel - Bill Upload */}
          <div style={{
            background: theme.colors.bgSecondary,
            borderRadius: theme.borderRadius.lg,
            padding: "2rem",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            height: "100%",
            position: "sticky",
            top: "100px"
          }}>
            <h2 style={{
              fontSize: "1.5rem",
              fontWeight: "700",
              marginBottom: "1.5rem",
              background: theme.colors.gradientSecondary,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>Upload Bills 📄</h2>

            <div style={{
              marginBottom: "2rem"
            }}>
              <input
                type="file"
                id="fileInput"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.doc,.docx,.txt"
                style={{ display: 'none' }}
              />

              <label htmlFor="fileInput" style={{
                display: "block",
                width: "100%",
                padding: "1rem",
                background: theme.colors.gradientPrimary,
                borderRadius: theme.borderRadius.md,
                color: theme.colors.textPrimary,
                textAlign: "center",
                cursor: "pointer",
                marginTop: "4rem",
                marginBottom: "4rem",
                fontSize: "1rem",
                fontWeight: "600",
                minHeight: "48px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <span style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem"
                }}>
                  Select Bill to Upload
                  <span style={{ fontSize: "1.2rem" }}>📄</span>
                </span>
              </label>
            </div>

            {/* File Name Dialog */}
            {showNameDialog && (
              <div style={{
                marginTop: "-1rem",
                marginBottom: "2rem",
                padding: "1rem",
                background: "rgba(255, 255, 255, 0.05)",
                borderRadius: theme.borderRadius.md
              }}>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="Enter bill name"
                  style={{
                    width: "100%",
                    padding: "1rem",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: theme.borderRadius.md,
                    color: theme.colors.textPrimary,
                    marginBottom: "1rem"
                  }}
                />
                <div style={{
                  display: "flex",
                  gap: "0.5rem"
                }}>
                  <button
                    onClick={handleUpload}
                    disabled={uploadingFile}
                    style={{
                      flex: 1,
                      padding: "1rem",
                      background: theme.colors.gradientPrimary,
                      border: "none",
                      borderRadius: theme.borderRadius.md,
                      color: theme.colors.textPrimary,
                      fontSize: "1rem",
                      fontWeight: "600",
                      cursor: uploadingFile ? "not-allowed" : "pointer",
                      opacity: uploadingFile ? 0.7 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem"
                    }}
                  >
                    <span>
                      {uploadingFile ? "Uploading..." : "Upload Bill"}
                    </span>
                    <span style={{ fontSize: "1.2rem" }}>{uploadingFile ? "🔄" : "⬆️"}</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowNameDialog(false);
                      setSelectedFile(null);
                      setFileName('');
                    }}
                    style={{
                      padding: "1rem",
                      background: "transparent",
                      border: `1px solid ${theme.colors.primary}`,
                      borderRadius: theme.borderRadius.md,
                      color: theme.colors.primary,
                      cursor: "pointer",
                      fontSize: "1rem",
                      fontWeight: "600"
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Recent Uploads */}
            <div style={{
              padding: "1.5rem",
              background: "rgba(255, 255, 255, 0.05)",
              borderRadius: theme.borderRadius.md
            }}>
              <h3 style={{
                fontSize: "1rem",
                fontWeight: "600",
                marginBottom: "1rem",
                color: theme.colors.textPrimary
              }}>Recent Uploads</h3>
              
              {recentUploads.length > 0 ? (
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem"
                }}>
                  {recentUploads.map((upload, index) => (
                    <div key={index} style={{
                      padding: "1rem",
                      background: "rgba(255, 255, 255, 0.03)",
                      borderRadius: theme.borderRadius.sm,
                      border: "1px solid rgba(255, 255, 255, 0.05)"
                    }}>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.5rem",
                        alignItems: "center"
                      }}>
                        <span style={{ fontWeight: "500" }}>{upload.fileName}</span>
                        <span style={{
                          fontSize: "0.8rem",
                          color: theme.colors.textSecondary
                        }}>{upload.uploadedAt}</span>
                      </div>
                      <div style={{
                        fontSize: "0.9rem",
                        color: theme.colors.textSecondary,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem"
                      }}>
                        <span>Status:</span>
                        <span style={{
                          color: upload.status === 'pending_analysis' ? '#FCD34D' : '#34D399',
                          fontSize: "0.8rem"
                        }}>
                          {upload.status === 'pending_analysis' ? '⏳ Pending Analysis' : '✓ Analyzed'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  color: theme.colors.textSecondary,
                  fontSize: "0.9rem",
                  textAlign: "center",
                  padding: "1.5rem 0",
                  borderRadius: theme.borderRadius.sm,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.05)"
                }}>
                  <p style={{ marginBottom: "0.5rem" }}>No bills uploaded yet</p>
                  <p style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                    Select a bill above to start your first upload
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - AI Analysis */}
          <div style={{
            background: theme.colors.bgSecondary,
            borderRadius: theme.borderRadius.lg,
            padding: "2rem",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            height: "100%",
            position: "sticky",
            top: "100px"
          }}>
            <h2 style={{
              fontSize: "1.5rem",
              fontWeight: "700",
              marginBottom: "1.5rem",
              background: theme.colors.gradientSecondary,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>AI Analysis: Fight Back Now 🤖</h2>

            <div style={{
              marginBottom: "2rem"
            }}>
              <select
                value={selectedBillForAnalysis}
                onChange={(e) => setSelectedBillForAnalysis(e.target.value)}
                style={{
                  width: "100%",
                  padding: "1rem",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: theme.borderRadius.md,
                  color: theme.colors.textPrimary,
                  cursor: "pointer",
                  marginBottom: "1rem"
                }}
              >
                <option value="">Select a bill to analyze</option>
                {recentUploads.map((upload, index) => (
                  <option key={index} value={upload.fileName}>
                    {upload.fileName}
                  </option>
                ))}
              </select>

              <button
                disabled={!selectedBillForAnalysis || analyzingBill}
                onClick={handleAnalysis}
                style={{
                  width: "100%",
                  padding: "1rem",
                  background: theme.colors.gradientPrimary,
                  border: "none",
                  borderRadius: theme.borderRadius.md,
                  color: theme.colors.textPrimary,
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: (selectedBillForAnalysis && !analyzingBill) ? "pointer" : "not-allowed",
                  opacity: (selectedBillForAnalysis && !analyzingBill) ? 1 : 0.7,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem"
                }}
              >
                <span>
                  {analyzingBill 
                    ? "Analyzing..."
                    : selectedBillForAnalysis 
                      ? `Analyze "${selectedBillForAnalysis}"`
                      : "Select a bill to analyze"}
                </span>
                <span style={{ fontSize: "1.2rem" }}>{analyzingBill ? "🔄" : "⚡"}</span>
              </button>
            </div>

            {/* Recent Analyses */}
            <div style={{
              marginTop: "2rem",
              padding: "1.5rem",
              background: "rgba(255, 255, 255, 0.05)",
              borderRadius: theme.borderRadius.md
            }}>
              <h3 style={{
                fontSize: "1rem",
                fontWeight: "600",
                marginBottom: "1rem"
              }}>Recent Analyses</h3>
              
              {recentAnalyses.length > 0 ? (
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem"
                }}>
                  {recentAnalyses.map((analysis, index) => (
                    <div key={index} style={{
                      padding: "1rem",
                      background: "rgba(255, 255, 255, 0.03)",
                      borderRadius: theme.borderRadius.sm
                    }}>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.5rem"
                      }}>
                        <span>{analysis.fileName}</span>
                        <span style={{
                          fontSize: "0.8rem",
                          color: theme.colors.textSecondary
                        }}>{analysis.analyzedAt}</span>
                      </div>
                      <div style={{
                        fontSize: "0.9rem",
                        color: theme.colors.textSecondary
                      }}>
                        <p>Potential Savings: {analysis.findings.potentialSavings}</p>
                        <p>Errors Found: {analysis.findings.errorCount}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  color: theme.colors.textSecondary,
                  fontSize: "0.9rem",
                  textAlign: "center",
                  padding: "1.5rem 0",
                  borderRadius: theme.borderRadius.sm,
                  background: "rgba(255, 255, 255, 0.03)"
                }}>
                  <p style={{ marginBottom: "0.5rem" }}>No analyses completed yet</p>
                  <p style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                    Select a bill above to start your first analysis
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Generate Dispute Letter */}
          <div style={{
            background: theme.colors.bgSecondary,
            borderRadius: theme.borderRadius.lg,
            padding: "2rem",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            height: "100%",
            position: "sticky",
            top: "100px"
          }}>
            <h2 style={{
              fontSize: "1.5rem",
              fontWeight: "700",
              marginBottom: "1.5rem",
              background: theme.colors.gradientSecondary,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>Generate Dispute Letter: Take Action! 💪</h2>

            <div style={{
              marginBottom: "2rem"
            }}>
              <select
                value={selectedBillForDispute}
                onChange={(e) => setSelectedBillForDispute(e.target.value)}
                style={{
                  width: "100%",
                  padding: "1rem",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: theme.borderRadius.md,
                  color: theme.colors.textPrimary,
                  cursor: "pointer",
                  marginBottom: "1rem"
                }}
              >
                <option value="">Select an analyzed bill</option>
                {analyzedBills.map((bill, index) => (
                  <option key={index} value={bill.fileName}>
                    {bill.fileName}
                  </option>
                ))}
              </select>

              <button
                disabled={!selectedBillForDispute}
                style={{
                  width: "100%",
                  padding: "1rem",
                  background: theme.colors.gradientPrimary,
                  border: "none",
                  borderRadius: theme.borderRadius.md,
                  color: theme.colors.textPrimary,
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: selectedBillForDispute ? "pointer" : "not-allowed",
                  opacity: selectedBillForDispute ? 1 : 0.7,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem"
                }}
              >
                <span>
                  {selectedBillForDispute 
                    ? `Generate Dispute Letter for "${selectedBillForDispute}"`
                    : "Select a bill to dispute"}
                </span>
                <span style={{ fontSize: "1.2rem" }}>📝</span>
              </button>
            </div>

            {/* Recent Disputes */}
            <div style={{
              marginTop: "2rem",
              padding: "1.5rem",
              background: "rgba(255, 255, 255, 0.05)",
              borderRadius: theme.borderRadius.md
            }}>
              <h3 style={{
                fontSize: "1rem",
                fontWeight: "600",
                marginBottom: "1rem"
              }}>Recent Disputes</h3>
              
              <div style={{
                color: theme.colors.textSecondary,
                fontSize: "0.9rem",
                textAlign: "center",
                padding: "1.5rem 0",
                borderRadius: theme.borderRadius.sm,
                background: "rgba(255, 255, 255, 0.03)"
              }}>
                <p style={{ marginBottom: "0.5rem" }}>No disputes generated yet</p>
                <p style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                  Select an analyzed bill above to generate your first dispute letter
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 