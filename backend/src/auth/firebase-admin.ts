import admin from "firebase-admin";

export function getFirebaseAdmin() {
  if (admin.apps.length) return admin;

  
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
  
  return admin;
}
