import { ReactNode } from 'react';

import { Box, Tooltip, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

import { mobileCardStyles } from './mobileCardStyles';

export interface MobileCardShellProps {
  children: ReactNode;
  selected?: boolean;
  width?: string;
}

export interface MobileCardHeaderProps {
  checkbox?: ReactNode;
  headerAccessory?: ReactNode;
  content: ReactNode;
  action?: ReactNode;
}

export interface MobileCardFieldRowProps {
  label: ReactNode;
  value?: ReactNode;
  valueColor?: string;
  emphasis?: boolean;
  separatorTop?: boolean;
  testId?: string;
  // Truncates the value with an ellipsis and shows the full text in a
  // native tooltip on hover, for values whose length varies unpredictably
  // (e.g. a client-supplied reference number).
  truncate?: boolean;
}

export interface MobileCardFieldGroupProps {
  rows: MobileCardFieldRowProps[];
  align?: 'left' | 'right';
  compact?: boolean;
}

const MobileCardContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'selected' && prop !== 'width',
})<{ selected?: boolean; width?: string }>(({ theme, selected, width }) => ({
  backgroundColor: selected ? theme.palette.highlight.main : '#FFFFFF',
  borderRadius: mobileCardStyles.shell.borderRadius,
  border: `${mobileCardStyles.shell.borderWidth} ${mobileCardStyles.shell.borderStyle} ${theme.mixins.border.color}`,
  // 'hidden', not 'auto': the header divider bleeds exactly to the padding
  // edge, and at fractional card widths desktop Chrome rounds that 1px over —
  // 'auto' then reserves a horizontal scrollbar inside the card bottom, which
  // reads as extra footer height. Card content is designed to fit.
  overflowX: 'hidden',
  width: width ?? '100%',
  padding: mobileCardStyles.shell.padding,
  marginBottom: mobileCardStyles.shell.marginBottom,
  justifySelf: 'center',
}));

const HeaderContainer = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'center',
  minHeight: mobileCardStyles.header.minHeight,
  paddingBottom: mobileCardStyles.header.paddingBottom,
  marginBottom: mobileCardStyles.header.marginBottom,
  borderBottom: `${mobileCardStyles.header.borderBottomWidth} ${mobileCardStyles.header.borderBottomStyle} ${theme.mixins.border.color}`,
  marginLeft: `-${mobileCardStyles.header.bleedX}`,
  marginRight: `-${mobileCardStyles.header.bleedX}`,
  paddingLeft: mobileCardStyles.header.bleedX,
  paddingRight: mobileCardStyles.header.bleedX,
}));

const HeaderLeading = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: mobileCardStyles.header.contentGap,
  minWidth: 0,
});

const HeaderContent = styled(Box)({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: mobileCardStyles.header.titleGap,
  minWidth: 0,
  textAlign: 'left',
});

const HeaderAdornments = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: mobileCardStyles.header.adornmentGap,
  minWidth: 0,
  flex: '0 0 auto',
});

const FieldGroupGrid = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'compact',
})<{ compact?: boolean }>(({ compact }) => ({
  display: 'grid',
  gridTemplateColumns: compact
    ? `minmax(0, 1fr) ${mobileCardStyles.fieldGridCompact.rightOuterColumnWidth}`
    : `minmax(0, 1fr) ${mobileCardStyles.fieldGrid.rightOuterColumnWidth}`,
  alignItems: 'flex-start',
  columnGap: compact
    ? mobileCardStyles.fieldGridCompact.groupGap
    : mobileCardStyles.fieldGrid.groupGap,
  rowGap: mobileCardStyles.fieldColumn.rowGap,
  width: '100%',
}));

const FieldCell = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'align' && prop !== 'compact',
})<{ align: 'left' | 'right'; compact?: boolean }>(({ align, compact }) => ({
  minWidth: 0,
  width: compact || align === 'right' ? '100%' : 'max-content',
  justifySelf: align === 'right' ? 'end' : compact ? 'stretch' : 'start',
}));

const FieldRowContainer = styled(Box, {
  shouldForwardProp: (prop) =>
    prop !== 'align' && prop !== 'compact' && prop !== 'leftLabelWidth',
})<{ align: 'left' | 'right'; compact?: boolean; leftLabelWidth?: string }>(
  ({ align, compact, leftLabelWidth }) => ({
    display: 'grid',
    gridTemplateColumns:
      align === 'right'
        ? compact
          ? `minmax(${mobileCardStyles.fieldColumn.rightLabelWidth}, max-content) minmax(${mobileCardStyles.fieldGridCompact.rightValueMinWidth}, 1fr)`
          : `${mobileCardStyles.fieldColumn.rightLabelWidth} minmax(${mobileCardStyles.fieldColumn.rightValueMinWidth}, 1fr)`
        : compact
          ? `minmax(${leftLabelWidth ?? mobileCardStyles.fieldGridCompact.leftLabelWidth}, max-content) minmax(${mobileCardStyles.fieldColumn.leftValueMinWidth}, 1fr)`
          : `minmax(${mobileCardStyles.fieldColumn.leftLabelWidth}, max-content) minmax(0, max-content)`,
    columnGap:
      align === 'right'
        ? mobileCardStyles.fieldColumn.rightPairGap
        : compact
          ? mobileCardStyles.fieldGridCompact.leftPairGap
          : mobileCardStyles.fieldColumn.leftPairGap,
    alignItems: 'baseline',
    minHeight: mobileCardStyles.fieldRow.minHeight,
    minWidth: 0,
    width: compact || align === 'right' ? '100%' : 'max-content',
  }),
);

const getSeparatorSx = (borderColor: string) => ({
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: `calc(-1 * ${mobileCardStyles.fieldColumn.rowGap} / 2)`,
    left: 0,
    right: 0,
    borderTop: `${mobileCardStyles.fieldRow.separatorBorderWidth} ${mobileCardStyles.fieldRow.separatorBorderStyle} ${borderColor}`,
  },
});

export function MobileCardShell({
  children,
  selected = false,
  width,
}: MobileCardShellProps) {
  return (
    <MobileCardContainer selected={selected} width={width}>
      {children}
    </MobileCardContainer>
  );
}

export function MobileCardHeader({
  checkbox,
  headerAccessory,
  content,
  action,
}: MobileCardHeaderProps) {
  const hasLeadingAdornment = !!checkbox || !!headerAccessory;

  return (
    <HeaderContainer>
      <HeaderLeading>
        {hasLeadingAdornment && (
          <HeaderAdornments>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                minWidth: checkbox
                  ? mobileCardStyles.header.checkboxColumnWidth
                  : 0,
              }}
            >
              {checkbox}
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                minWidth: headerAccessory
                  ? mobileCardStyles.header.accessoryColumnWidth
                  : 0,
              }}
            >
              {headerAccessory}
            </Box>
          </HeaderAdornments>
        )}
        <HeaderContent>{content}</HeaderContent>
      </HeaderLeading>
      <Box
        sx={{
          minWidth: mobileCardStyles.header.sideColumnWidth,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: mobileCardStyles.header.actionGap,
          flexWrap: 'nowrap',
        }}
      >
        {action}
      </Box>
    </HeaderContainer>
  );
}

export function MobileCardFieldRow({
  label,
  value,
  valueColor,
  emphasis = false,
  testId,
}: MobileCardFieldRowProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'max-content max-content',
        columnGap: mobileCardStyles.fieldColumn.leftPairGap,
        alignItems: 'baseline',
        minHeight: mobileCardStyles.fieldRow.minHeight,
      }}
      data-testid={testId}
    >
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
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontSize: mobileCardStyles.typography.valueFontSize,
          fontWeight: emphasis
            ? mobileCardStyles.typography.emphasisFontWeight
            : mobileCardStyles.typography.valueFontWeight,
          fontStyle: mobileCardStyles.typography.valueFontStyle,
          lineHeight: 1.25,
          color: valueColor ?? mobileCardStyles.typography.valueColor,
          justifySelf: 'start',
          textAlign: 'left',
          minWidth: 0,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export function MobileCardFieldGroup({
  rows,
  align = 'left',
  compact = false,
}: MobileCardFieldGroupProps) {
  return (
    <FieldCell align={align} compact={compact}>
      {rows.map((row, index) => (
        <FieldRowContainer
          key={row.testId ?? index}
          align={align}
          compact={compact}
          sx={(theme) => ({
            ...(row.separatorTop
              ? getSeparatorSx(theme.mixins.border.color)
              : {}),
          })}
        >
          <Typography
            variant="body2"
            sx={{
              fontSize: mobileCardStyles.typography.labelFontSize,
              fontWeight: mobileCardStyles.typography.labelFontWeight,
              fontStyle: mobileCardStyles.typography.labelFontStyle,
              color: mobileCardStyles.typography.labelColor,
              lineHeight: 1.25,
              minHeight: mobileCardStyles.fieldRow.minHeight,
              display: 'flex',
              alignItems: 'baseline',
            }}
          >
            {row.label}
          </Typography>
          <Typography
            variant="body2"
            data-testid={row.testId}
            sx={{
              fontSize: mobileCardStyles.typography.valueFontSize,
              fontWeight: row.emphasis
                ? mobileCardStyles.typography.emphasisFontWeight
                : mobileCardStyles.typography.valueFontWeight,
              fontStyle: mobileCardStyles.typography.valueFontStyle,
              lineHeight: 1.25,
              color: row.valueColor ?? mobileCardStyles.typography.valueColor,
              justifySelf: align === 'right' ? 'end' : 'start',
              textAlign: align === 'right' ? 'right' : 'left',
              minHeight: mobileCardStyles.fieldRow.minHeight,
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
              minWidth: 0,
            }}
          >
            {row.value}
          </Typography>
        </FieldRowContainer>
      ))}
    </FieldCell>
  );
}

export function MobileCardFieldGrid({
  left,
  right,
  compact = false,
  leftLabelWidth,
}: {
  left: MobileCardFieldGroupProps['rows'];
  right: MobileCardFieldGroupProps['rows'];
  compact?: boolean;
  leftLabelWidth?: string;
}) {
  const rowCount = Math.max(left.length, right.length);

  return (
    <FieldGroupGrid compact={compact}>
      {Array.from({ length: rowCount }, (_, index) => {
        const leftRow = left[index];
        const rightRow = right[index];
        const leftValueEl = leftRow && (
          <Typography
            variant="body2"
            data-testid={leftRow.testId}
            sx={{
              fontSize: mobileCardStyles.typography.valueFontSize,
              fontWeight: leftRow.emphasis
                ? mobileCardStyles.typography.emphasisFontWeight
                : mobileCardStyles.typography.valueFontWeight,
              fontStyle: mobileCardStyles.typography.valueFontStyle,
              lineHeight: 1.25,
              color:
                leftRow.valueColor ?? mobileCardStyles.typography.valueColor,
              justifySelf: 'start',
              textAlign: 'left',
              minHeight: mobileCardStyles.fieldRow.minHeight,
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'flex-start',
              minWidth: 0,
              ...(leftRow.truncate && {
                display: 'block',
                width: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }),
            }}
          >
            {leftRow.value}
          </Typography>
        );

        const rightValueEl = rightRow && (
          <Typography
            variant="body2"
            data-testid={rightRow.testId}
            sx={{
              fontSize: mobileCardStyles.typography.valueFontSize,
              fontWeight: rightRow.emphasis
                ? mobileCardStyles.typography.emphasisFontWeight
                : mobileCardStyles.typography.valueFontWeight,
              fontStyle: mobileCardStyles.typography.valueFontStyle,
              lineHeight: 1.25,
              color:
                rightRow.valueColor ?? mobileCardStyles.typography.valueColor,
              justifySelf: 'end',
              textAlign: 'right',
              minHeight: mobileCardStyles.fieldRow.minHeight,
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'flex-end',
              minWidth: 0,
              ...(rightRow.truncate && {
                display: 'block',
                width: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }),
            }}
          >
            {rightRow.value}
          </Typography>
        );

        return (
          <Box
            key={leftRow?.testId ?? rightRow?.testId ?? index}
            sx={{ display: 'contents' }}
          >
            <FieldCell align="left" compact={compact}>
              {leftRow ? (
                <FieldRowContainer
                  align="left"
                  compact={compact}
                  leftLabelWidth={leftLabelWidth}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: mobileCardStyles.typography.labelFontSize,
                      fontWeight: mobileCardStyles.typography.labelFontWeight,
                      fontStyle: mobileCardStyles.typography.labelFontStyle,
                      color: mobileCardStyles.typography.labelColor,
                      lineHeight: 1.25,
                      minHeight: mobileCardStyles.fieldRow.minHeight,
                      display: 'flex',
                      alignItems: 'baseline',
                    }}
                  >
                    {leftRow.label}
                  </Typography>
                  {leftRow.truncate && typeof leftRow.value === 'string' ? (
                    <Tooltip title={leftRow.value} enterTouchDelay={200}>
                      {leftValueEl}
                    </Tooltip>
                  ) : (
                    leftValueEl
                  )}
                </FieldRowContainer>
              ) : (
                <Box sx={{ minHeight: mobileCardStyles.fieldRow.minHeight }} />
              )}
            </FieldCell>
            <FieldCell
              align="right"
              compact={compact}
              sx={{
                minWidth: 0,
                width: '100%',
                justifySelf: compact ? 'stretch' : 'stretch',
              }}
            >
              {rightRow ? (
                <FieldRowContainer
                  align="right"
                  compact={compact}
                  sx={(theme) => ({
                    ...(rightRow.separatorTop
                      ? getSeparatorSx(theme.mixins.border.color)
                      : {}),
                  })}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: mobileCardStyles.typography.labelFontSize,
                      fontWeight: mobileCardStyles.typography.labelFontWeight,
                      fontStyle: mobileCardStyles.typography.labelFontStyle,
                      color: mobileCardStyles.typography.labelColor,
                      lineHeight: 1.25,
                      minHeight: mobileCardStyles.fieldRow.minHeight,
                      display: 'flex',
                      alignItems: 'baseline',
                    }}
                  >
                    {rightRow.label}
                  </Typography>
                  {rightRow.truncate && typeof rightRow.value === 'string' ? (
                    <Tooltip title={rightRow.value} enterTouchDelay={200}>
                      {rightValueEl}
                    </Tooltip>
                  ) : (
                    rightValueEl
                  )}
                </FieldRowContainer>
              ) : (
                <Box sx={{ minHeight: mobileCardStyles.fieldRow.minHeight }} />
              )}
            </FieldCell>
          </Box>
        );
      })}
    </FieldGroupGrid>
  );
}
