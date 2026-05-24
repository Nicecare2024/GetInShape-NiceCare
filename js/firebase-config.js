(() => {
  const firebaseConfig = {
    apiKey: "AIzaSyB-nxvyQIV6TRs60cmFjB7hplCwgY8SwEI",
    authDomain: "e-data-6ca63.firebaseapp.com",
    projectId: "e-data-6ca63",
    storageBucket: "e-data-6ca63.firebasestorage.app",
    messagingSenderId: "76571848548",
    appId: "1:76571848548:web:fa52ee1a390e7d49031471",
  };

  if (!window.firebase || !window.firebase.firestore) {
    throw new Error("Firebase SDK is required before firebase-config.js");
  }

  if (!window.firebase.apps.length) {
    window.firebase.initializeApp(firebaseConfig);
  }

  window.db = window.firebase.firestore();
})();
