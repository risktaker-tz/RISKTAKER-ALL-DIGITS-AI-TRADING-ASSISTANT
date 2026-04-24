"use client";

import { create } from "zustand";

type ThemeMode = "light" | "dark";

type AppStore = {
  theme: ThemeMode;
  locale: string;
  offlineSmsOptIn: boolean;
  setTheme: (theme: ThemeMode) => void;
  setLocale: (locale: string) => void;
  setOfflineSmsOptIn: (enabled: boolean) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  theme: "dark",
  locale: "en",
  offlineSmsOptIn: false,
  setTheme: (theme) => set({ theme }),
  setLocale: (locale) => set({ locale }),
  setOfflineSmsOptIn: (offlineSmsOptIn) => set({ offlineSmsOptIn })
}));
