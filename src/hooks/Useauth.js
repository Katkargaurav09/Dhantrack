import { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { auth, provider } from "../firebase/config";

export default function useAuth() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // true while checking auth state

  // ── Listen for auth state changes ──────────────────────────
  // This runs on every page load — if user was logged in before
  // they stay logged in automatically
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid:   firebaseUser.uid,
          name:  firebaseUser.displayName || firebaseUser.email.split("@")[0],
          email: firebaseUser.email,
          photo: firebaseUser.photoURL,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Email / Password Sign In ────────────────────────────────
  async function login(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  }

  // ── Email / Password Register ───────────────────────────────
  async function register(name, email, password) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    // Save display name to Firebase profile
    await updateProfile(result.user, { displayName: name });
    // Update local state with name
    setUser({
      uid:   result.user.uid,
      name,
      email: result.user.email,
      photo: null,
    });
    return result.user;
  }

  // ── Google Sign In ──────────────────────────────────────────
  async function loginWithGoogle() {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  }

  // ── Sign Out ────────────────────────────────────────────────
  async function logout() {
    await signOut(auth);
    setUser(null);
  }

  return { user, loading, login, register, loginWithGoogle, logout };
}