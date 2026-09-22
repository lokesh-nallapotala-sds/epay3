import { ChangeEvent } from 'react';

import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import CompactFilterSelect from 'shared/components/CompactFilterSelect';
import { getCompactFilterFieldSx } from 'shared/components/compactFilterFieldStyles';
import ExportSelectionButton from 'shared/components/ExportSelectionButton';
import { useFormat } from 'hooks/useFormat';

export interface IUserFilterOptions {
  status: string;
  searchText: string;
  role: string;
}

interface UserFiltersProps {
  isMobile?: boolean;
  searchText: string;
  userFilter: IUserFilterOptions;
  statuses: { key: string; displayText: string }[];
  roles: { key: string; displayText: string }[];
  onSearchChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onStatusChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onRoleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onExport: (option: string) => void;
}

export function UserFilters({
  isMobile = false,
  searchText,
  userFilter,
  statuses,
  roles,
  onSearchChange,
  onStatusChange,
  onRoleChange,
  onExport,
}: UserFiltersProps) {
  const f = useFormat();

  if (isMobile) {
    return (
      <Grid
        container
        direction="column"
        alignItems="stretch"
        sx={{ marginBottom: 0 }}
      >
        <Grid item>
          <Grid container direction="column">
            <Grid item>
              <Grid
                container
                direction="column"
                rowGap=".3rem"
                marginBottom="16px"
              >
                <Grid item>
                  <Typography variant="fieldHeader">
                    {f('user.search')}
                  </Typography>
                </Grid>
                <Grid item>
                  <TextField
                    type="text"
                    size="small"
                    fullWidth
                    sx={getCompactFilterFieldSx}
                    value={searchText}
                    placeholder={f('user.search.placeholder')}
                    onChange={onSearchChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start" sx={{ padding: 0 }}>
                          <SearchOutlinedIcon
                            fontSize="small"
                            sx={{ padding: 0 }}
                          />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid item>
              <CompactFilterSelect
                label={f('user.status')}
                value={userFilter.status}
                options={statuses.map((sts) => ({
                  key: sts.key,
                  value: sts.displayText,
                }))}
                onChange={onStatusChange}
                sx={{ marginBottom: '16px' }}
              />
            </Grid>
            <Grid item>
              <CompactFilterSelect
                label={f('user.user_role')}
                value={userFilter.role}
                options={roles.map((role) => ({
                  key: role.key,
                  value: role.displayText,
                }))}
                onChange={onRoleChange}
                sx={{ marginBottom: '16px' }}
              />
            </Grid>
          </Grid>
        </Grid>
        <Grid item>
          <Grid
            container
            direction="column"
            rowGap=".15rem"
            alignItems="flex-end"
            marginBottom="8px"
          >
            <Grid item sx={{ width: '160px', maxWidth: '100%' }}>
              <ExportSelectionButton onSelect={onExport} padding="6px 14px" />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    );
  }

  return (
    <Grid
      container
      sx={{
        marginBottom: 0,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 160px',
        columnGap: '24px',
        rowGap: '16px',
        alignItems: 'end',
        width: '100%',
      }}
    >
      <Grid item sx={{ minWidth: 0 }}>
        <Grid
          container
          sx={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(240px, 280px) minmax(160px, 180px) minmax(160px, 180px)',
            columnGap: '24px',
            rowGap: '16px',
            alignItems: 'end',
            minWidth: 0,
          }}
        >
          <Grid item sx={{ minWidth: 0 }}>
            <Grid container direction="column" rowGap=".3rem">
              <Grid item>
                <Typography variant="fieldHeader">
                  {f('user.search')}
                </Typography>
              </Grid>
              <Grid item>
                <TextField
                  type="text"
                  size="small"
                  fullWidth
                  sx={getCompactFilterFieldSx}
                  value={searchText}
                  placeholder={f('user.search.placeholder')}
                  onChange={onSearchChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start" sx={{ padding: 0 }}>
                        <SearchOutlinedIcon
                          fontSize="small"
                          sx={{ padding: 0 }}
                        />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </Grid>
          <Grid item sx={{ minWidth: 0 }}>
            <CompactFilterSelect
              label={f('user.status')}
              value={userFilter.status}
              options={statuses.map((sts) => ({
                key: sts.key,
                value: sts.displayText,
              }))}
              onChange={onStatusChange}
            />
          </Grid>
          <Grid item sx={{ minWidth: 0 }}>
            <CompactFilterSelect
              label={f('user.user_role')}
              value={userFilter.role}
              options={roles.map((role) => ({
                key: role.key,
                value: role.displayText,
              }))}
              onChange={onRoleChange}
            />
          </Grid>
        </Grid>
      </Grid>
      <Grid item sx={{ minWidth: 0, justifySelf: 'end' }}>
        <Grid
          container
          direction="column"
          rowGap=".15rem"
          alignItems="flex-end"
        >
          <Grid item>
            <Typography variant="fieldHeader">&nbsp;</Typography>
          </Grid>
          <Grid item sx={{ width: '160px', maxWidth: '100%' }}>
            <ExportSelectionButton onSelect={onExport} padding="6px 14px" />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}
