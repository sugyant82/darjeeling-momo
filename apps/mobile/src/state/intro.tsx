import { createContext, useContext, useState } from 'react';

/**
 * How long screens mounted at launch should hold their entrance animations so they play as
 * the splash fades rather than hidden behind it. 0 once the splash has finished.
 */
const IntroContext = createContext(0);

export const IntroProvider = IntroContext.Provider;

/** Entrance delay to add, captured once when the calling component mounts. */
export function useIntroDelay(): number {
  const value = useContext(IntroContext);
  const [delay] = useState(value);
  return delay;
}
