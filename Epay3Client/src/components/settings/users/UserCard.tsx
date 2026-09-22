import { Box } from '@mui/system';
import { styled, useTheme } from '@mui/material/styles';
import { Grid } from '@mui/material';
import Typography from '@mui/material/Typography';
import { User } from 'types';
import { EpayDataTableColumnDefinition } from 'shared/components/EpayDataTable';
import { MobileCardHeader } from 'shared/components/common/MobileCardPrimitives';
import { mobileCardStyles } from 'shared/components/common/mobileCardStyles';

interface CardListBoxProps {
  width: string;
}

const CardListBox = styled(Box)<CardListBoxProps>(({ theme, width }) => ({
  borderRadius: mobileCardStyles.shell.borderRadius,
  border: `1px solid ${theme.mixins.border.color}`,
  overflowX: 'auto',
  width: width ?? '100%',
  padding: mobileCardStyles.shell.padding,
  marginBottom: mobileCardStyles.shell.marginBottom,
  justifySelf: 'center',
}));

interface UserCardProps {
  data: User;
  width: string;
  colDefs: EpayDataTableColumnDefinition<any>[];
}

export default function UserCard(props: UserCardProps) {
  const theme = useTheme();
  const { colDefs, data } = props;
  if (colDefs.length === 0) return null;

  const identityColDef = colDefs[0];
  const lastColDef = colDefs[colDefs.length - 1];
  const actionsColDef =
    colDefs.length > 1 && !lastColDef.header ? lastColDef : null;
  const detailColDefs = colDefs.slice(1, actionsColDef ? -1 : undefined);

  return (
    <CardListBox width={props.width}>
      <MobileCardHeader
        content={
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              minWidth: 0,
              overflow: 'hidden',
              '& .MuiButton-root': {
                display: 'inline-block',
                padding: 0,
                minWidth: 0,
                maxWidth: 'none',
                height: 'auto',
                minHeight: 0,
                lineHeight: 1.2,
                overflow: 'visible',
                textOverflow: 'clip',
                whiteSpace: 'nowrap',
                fontSize: mobileCardStyles.typography.titleFontSize,
                fontWeight: mobileCardStyles.typography.valueFontWeight,
                color: theme.palette.info.main,
                textUnderlineOffset: '2px',
              },
            }}
          >
            {identityColDef.renderer && identityColDef.renderer(data)}
          </Box>
        }
        action={actionsColDef?.renderer && actionsColDef.renderer(data)}
      />
      {detailColDefs.map((colDef, index) => {
        const content = colDef.renderer
          ? colDef.renderer(data)
          : colDef.field && data[colDef.field];
        return (
          <Grid
            key={colDef.field ?? `col-${index}`}
            container
            paddingTop=".8rem"
            alignItems="center"
            wrap="nowrap"
            columnGap="12px"
          >
            <Grid item flexShrink={0} minWidth="8rem">
              <Typography
                variant="body2"
                sx={{
                  fontSize: mobileCardStyles.typography.labelFontSize,
                  fontWeight: mobileCardStyles.typography.labelFontWeight,
                  fontStyle: mobileCardStyles.typography.labelFontStyle,
                  color: mobileCardStyles.typography.labelColor,
                  lineHeight: 1.25,
                }}
              >
                {colDef.header}
              </Typography>
            </Grid>
            <Grid
              item
              flexGrow={1}
              minWidth={0}
              display="flex"
              justifyContent="flex-start"
              textAlign="left"
              overflow="hidden"
              sx={{
                '& .MuiTextField-root': { maxWidth: '100%' },
                '& .MuiInputBase-root': {
                  fontSize: mobileCardStyles.typography.valueFontSize,
                },
                '& .MuiTypography-root': {
                  fontSize: mobileCardStyles.typography.valueFontSize,
                  fontWeight: mobileCardStyles.typography.valueFontWeight,
                  fontStyle: mobileCardStyles.typography.valueFontStyle,
                  lineHeight: 1.25,
                },
              }}
            >
              {typeof content === 'string' ? (
                <Typography
                  variant="body2"
                  noWrap
                  title={content}
                  sx={{ color: mobileCardStyles.typography.valueColor }}
                >
                  {content}
                </Typography>
              ) : (
                content
              )}
            </Grid>
          </Grid>
        );
      })}
    </CardListBox>
  );
}
