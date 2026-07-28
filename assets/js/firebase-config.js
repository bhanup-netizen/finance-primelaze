// Firebase web config for the Primelaze dashboard.
// This is a PUBLIC client identifier — safe to commit. Real security comes from
// Firebase Auth + the Firestore security rules (see firestore.rules).
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBxCXU3700_2kZqjtrx3paiCHOzPtDZWFc",
  authDomain: "primelaze-fd050.firebaseapp.com",
  projectId: "primelaze-fd050",
  storageBucket: "primelaze-fd050.firebasestorage.app",
  messagingSenderId: "983613848",
  appId: "1:983613848:web:7116cd7fa20945e201ebed",
  measurementId: "G-YZ19BJPD18",
};

// Email that is always treated as super-admin, even before any Firestore user
// docs exist (bootstrap). Change this to your admin email.
window.BOOTSTRAP_ADMIN_EMAIL = "bhanup@primelaze.com";
