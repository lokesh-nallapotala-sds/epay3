import { createContext, ReactNode, useContext } from 'react';
import { Box, BoxProps, Tabs, TabsProps } from '@mui/material';

const TabContextValue = createContext<string | false>(false);

type EpayTabContextProps = {
  children: ReactNode;
  value: string;
};

export function EpayTabContext({ children, value }: EpayTabContextProps) {
  return (
    <TabContextValue.Provider value={value}>
      {children}
    </TabContextValue.Provider>
  );
}

type EpayTabListProps = Omit<TabsProps, 'value'>;

export function EpayTabList(props: EpayTabListProps) {
  const value = useContext(TabContextValue);

  return <Tabs {...props} value={value} />;
}

type EpayTabPanelProps = BoxProps & {
  children?: ReactNode;
  value: string;
};

export function EpayTabPanel({ children, value, ...props }: EpayTabPanelProps) {
  const selectedValue = useContext(TabContextValue);

  return (
    <Box
      role="tabpanel"
      hidden={selectedValue !== value}
      {...props}
      className={`MuiTabPanel-root ${props.className ?? ''}`.trim()}
    >
      {selectedValue === value ? children : null}
    </Box>
  );
}
