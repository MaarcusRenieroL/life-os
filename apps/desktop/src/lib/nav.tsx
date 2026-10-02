import { createContext, useContext } from 'react';

/** Lets a screen send you to another module (Home's portals, "quest board →" links). */
export const NavContext = createContext<(screen: string) => void>(() => {});
export const useNav = () => useContext(NavContext);
