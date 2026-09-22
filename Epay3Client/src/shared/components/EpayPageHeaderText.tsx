import * as React from 'react';
import { Grid, Typography } from '@mui/material';

interface EpayPageHeaderTextProps {
  header: string;
  subheader?: string | null;
}

const EpayPageHeaderText = ({ header, subheader }: EpayPageHeaderTextProps) => {
  return (
    <Grid item display="flex" flexDirection="column" id="headerText">
      <Typography variant="h1">{header}</Typography>
      {subheader && (
        <Typography variant="subheader" sx={{ marginTop: '3px' }}>
          {subheader}
        </Typography>
      )}
    </Grid>
  );
};

export default EpayPageHeaderText;
