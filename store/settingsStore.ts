"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "light" | "amoled";

export interface NotificationPrefs {
  examReminders: boolean;
  attendanceWarnings: boolean;
  budgetWarnings: boolean;
  emailBackup: boolean;
  friendActivity: boolean;
}

export interface PrivacyPrefs {
  steps: boolean;
  location: boolean;
  attendance: boolean;
  finance: boolean;
  profileFriendsOnly: boolean;
}

interface SettingsState {
  theme: Theme;
  defaultRequiredPercentage: number;
  semesterStart: string | null;
  semesterEnd: string | null;
  reminderTime: string;
  notifications: NotificationPrefs;
  privacy: PrivacyPrefs;
  locationSharing: boolean;
  campusCenter: { lat: number; lng: number; radiusM: number } | null;
  dismissedAlerts: string[];
  onboarded: boolean;
  setTheme: (t: Theme) => void;
  setDefaultRequiredPercentage: (v: number) => void;
  setSemester: (start: string | null, end: string | null) => void;
  setReminderTime: (t: string) => void;
  setNotificationPref: <K extends keyof NotificationPrefs>(key: K, value: boolean) => void;
  setPrivacyPref: <K extends keyof PrivacyPrefs>(key: K, value: boolean) => void;
  setLocationSharing: (v: boolean) => void;
  setCampusCenter: (c: { lat: number; lng: number; radiusM: number } | null) => void;
  dismissAlert: (id: string) => void;
  setOnboarded: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "light",
      defaultRequiredPercentage: 75,
      semesterStart: null,
      semesterEnd: null,
      reminderTime: "08:00",
      notifications: {
        examReminders: true,
        attendanceWarnings: true,
        budgetWarnings: true,
        emailBackup: true,
        friendActivity: true,
      },
      privacy: {
        steps: true,
        location: false,
        attendance: true,
        finance: false,
        profileFriendsOnly: false,
      },
      locationSharing: false,
      campusCenter: null,
      dismissedAlerts: [],
      onboarded: false,
      setTheme: (theme) => set({ theme }),
      setDefaultRequiredPercentage: (defaultRequiredPercentage) =>
        set({ defaultRequiredPercentage }),
      setSemester: (semesterStart, semesterEnd) => set({ semesterStart, semesterEnd }),
      setReminderTime: (reminderTime) => set({ reminderTime }),
      setNotificationPref: (key, value) =>
        set((s) => ({ notifications: { ...s.notifications, [key]: value } })),
      setPrivacyPref: (key, value) =>
        set((s) => ({ privacy: { ...s.privacy, [key]: value } })),
      setLocationSharing: (locationSharing) => set({ locationSharing }),
      setCampusCenter: (campusCenter) => set({ campusCenter }),
      dismissAlert: (id) =>
        set((s) => ({ dismissedAlerts: [...s.dismissedAlerts.slice(-30), id] })),
      setOnboarded: (onboarded) => set({ onboarded }),
    }),
    { name: "pulse-settings" }
  )
);
